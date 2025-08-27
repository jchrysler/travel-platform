from typing import Any, Dict, List
from urllib.parse import urlparse
from langchain_core.messages import AnyMessage, AIMessage, HumanMessage

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


def get_research_topic(messages: List[AnyMessage]) -> str:
    """
    Get the research topic from the messages.
    """
    # check if request has a history and combine the messages into a single string
    if len(messages) == 1:
        research_topic = messages[-1].content
    else:
        research_topic = ""
        for message in messages:
            if isinstance(message, HumanMessage):
                research_topic += f"User: {message.content}\n"
            elif isinstance(message, AIMessage):
                research_topic += f"Assistant: {message.content}\n"
    return research_topic


def resolve_urls(urls_to_resolve: List[Any], id: int) -> Dict[str, str]:
    """
    Create a map of the vertex ai search urls to cleaner URLs.
    For now, just remove the ugly redirect URLs and create clean anchor links.
    """
    resolved_map = {}
    
    for idx, site in enumerate(urls_to_resolve):
        url = site.web.uri
        if url not in resolved_map:
            # For Google redirect URLs, create a clean anchor link using the source title
            if "vertexaisearch.cloud.google.com" in url:
                title = getattr(site.web, 'title', f'Source {idx + 1}')
                # Create a clean domain-based anchor
                if '.' in title:
                    domain = title.split('.')[0].strip()
                else:
                    domain = title.strip()
                clean_anchor = f"#{domain.replace(' ', '-').replace('(', '').replace(')', '').lower()}"
                resolved_map[url] = clean_anchor
            else:
                # If it's already a direct URL, use it as-is
                resolved_map[url] = url

    return resolved_map


def insert_citation_markers(text, citations_list):
    """
    Makes the actual cited text clickable instead of adding separate citation links.
    
    Args:
        text (str): The original text string.
        citations_list (list): A list of dictionaries with start_index, end_index, and segments.

    Returns:
        str: The text with cited segments made into clickable links.
    """
    # Sort citations by start_index in descending order to work backwards
    sorted_citations = sorted(
        citations_list, key=lambda c: c["start_index"], reverse=True
    )

    modified_text = text
    for citation_info in sorted_citations:
        start_idx = citation_info["start_index"]
        end_idx = citation_info["end_index"]
        
        # Get the text that should be made clickable
        cited_text = modified_text[start_idx:end_idx]
        
        # Use the first (most relevant) source for the link
        if citation_info["segments"]:
            segment = citation_info["segments"][0]
            clickable_text = f"[{cited_text}]({segment['short_url']})"
            
            # Replace the original text with the clickable version
            modified_text = (
                modified_text[:start_idx] + clickable_text + modified_text[end_idx:]
            )

    return modified_text


def get_citations(response, resolved_urls_map):
    """
    Extracts and formats citation information from a Gemini model's response.

    This function processes the grounding metadata provided in the response to
    construct a list of citation objects. Each citation object includes the
    start and end indices of the text segment it refers to, and a string
    containing formatted markdown links to the supporting web chunks.

    Args:
        response: The response object from the Gemini model, expected to have
                  a structure including `candidates[0].grounding_metadata`.
                  It also relies on a `resolved_map` being available in its
                  scope to map chunk URIs to resolved URLs.

    Returns:
        list: A list of dictionaries, where each dictionary represents a citation
              and has the following keys:
              - "start_index" (int): The starting character index of the cited
                                     segment in the original text. Defaults to 0
                                     if not specified.
              - "end_index" (int): The character index immediately after the
                                   end of the cited segment (exclusive).
              - "segments" (list[str]): A list of individual markdown-formatted
                                        links for each grounding chunk.
              - "segment_string" (str): A concatenated string of all markdown-
                                        formatted links for the citation.
              Returns an empty list if no valid candidates or grounding supports
              are found, or if essential data is missing.
    """
    citations = []

    # Ensure response and necessary nested structures are present
    if not response or not response.candidates:
        return citations

    candidate = response.candidates[0]
    if (
        not hasattr(candidate, "grounding_metadata")
        or not candidate.grounding_metadata
        or not hasattr(candidate.grounding_metadata, "grounding_supports")
    ):
        return citations

    for support in candidate.grounding_metadata.grounding_supports:
        citation = {}

        # Ensure segment information is present
        if not hasattr(support, "segment") or support.segment is None:
            continue  # Skip this support if segment info is missing

        start_index = (
            support.segment.start_index
            if support.segment.start_index is not None
            else 0
        )

        # Ensure end_index is present to form a valid segment
        if support.segment.end_index is None:
            continue  # Skip if end_index is missing, as it's crucial

        # Add 1 to end_index to make it an exclusive end for slicing/range purposes
        # (assuming the API provides an inclusive end_index)
        citation["start_index"] = start_index
        citation["end_index"] = support.segment.end_index

        citation["segments"] = []
        if (
            hasattr(support, "grounding_chunk_indices")
            and support.grounding_chunk_indices
        ):
            for ind in support.grounding_chunk_indices:
                try:
                    chunk = candidate.grounding_metadata.grounding_chunks[ind]
                    resolved_url = resolved_urls_map.get(chunk.web.uri, None)
                    citation["segments"].append(
                        {
                            "label": chunk.web.title.split(".")[:-1][0],
                            "short_url": resolved_url,
                            "value": chunk.web.uri,
                        }
                    )
                except (IndexError, AttributeError, NameError):
                    # Handle cases where chunk, web, uri, or resolved_map might be problematic
                    # For simplicity, we'll just skip adding this particular segment link
                    # In a production system, you might want to log this.
                    pass
        citations.append(citation)
    return citations
