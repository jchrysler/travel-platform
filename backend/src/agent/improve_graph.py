import os
import json
from typing import List, Dict, Any

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph import add_messages
from langchain_core.runnables import RunnableConfig
from google.genai import Client

from agent.state import ImproveState
from agent.prompts import (
    content_analysis_prompt,
    content_improvement_prompt,
    compliance_check_prompt,
    get_tone_description,
    get_citation_instructions,
)
from agent.utils import resolve_urls

load_dotenv()

if os.getenv("GEMINI_API_KEY") is None:
    raise ValueError("GEMINI_API_KEY is not set")

# Used for Google Search API
genai_client = Client(api_key=os.getenv("GEMINI_API_KEY"))


def analyze_content(state: ImproveState, config: RunnableConfig) -> Dict[str, Any]:
    """Analyze the original content to identify issues and gaps."""
    
    # Use the model from state or default to gemini-2.5-flash-lite
    model = state.get("model", "gemini-2.5-flash-lite")
    
    llm = ChatGoogleGenerativeAI(
        model=model,
        temperature=0.7,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )
    
    # Format the analysis prompt
    formatted_prompt = content_analysis_prompt.format(
        original_content=state["original_content"],
        issues_to_address=state.get("issues_to_address", "No specific issues provided"),
        target_keywords=state.get("target_keywords", ""),
    )
    
    # Get analysis
    response = llm.invoke(formatted_prompt)
    analysis = response.content
    
    # Extract key topics for research
    topics_prompt = f"""Based on this content analysis, extract 3-5 key topics that need research to substantiate claims:
    
    {analysis}
    
    Return only a JSON list of search queries, e.g., ["topic 1", "topic 2", "topic 3"]"""
    
    topics_response = llm.invoke(topics_prompt)
    try:
        # Try to parse JSON response
        content = topics_response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
        research_topics = json.loads(content)
    except:
        # Fallback to simple extraction
        research_topics = ["evidence " + state.get("target_keywords", "product benefits")]
    
    return {
        "content_analysis": {"analysis": analysis},
        "research_topics": research_topics
    }


def research_evidence(state: ImproveState, config: RunnableConfig) -> Dict[str, Any]:
    """Research evidence for unsubstantiated claims."""
    
    # Use the model from state or default to gemini-2.5-flash-lite
    model = state.get("model", "gemini-2.5-flash-lite")
    
    research_results = []
    
    for topic in state.get("research_topics", [])[:5]:  # Limit to 5 searches
        try:
            # Use Google Search API
            search_response = genai_client.models.generate_content(
                model=model,
                contents=f"Search the web for: {topic}"
            )
            
            if search_response.candidates:
                result_text = search_response.candidates[0].content.parts[0].text
                # Extract URLs from the search results
                urls = resolve_urls(result_text)
                research_results.append({
                    "topic": topic,
                    "content": result_text,
                    "sources": urls[:3]  # Limit to 3 sources per topic
                })
        except Exception as e:
            print(f"Search error for '{topic}': {e}")
            continue
    
    return {"research_results": research_results}


def improve_content(state: ImproveState, config: RunnableConfig) -> Dict[str, Any]:
    """Rewrite content with improvements and evidence."""
    
    # Use the model from state or default to gemini-2.5-flash-lite
    model = state.get("model", "gemini-2.5-flash-lite")
    
    llm = ChatGoogleGenerativeAI(
        model=model,
        temperature=0.7,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )
    
    # Format research results
    research_text = ""
    for result in state.get("research_results", []):
        research_text += f"\nTopic: {result['topic']}\n"
        research_text += f"Evidence: {result['content'][:500]}...\n"
        if result.get('sources'):
            research_text += f"Sources: {', '.join(result['sources'])}\n"
    
    # Get tone and citation instructions
    tone_desc = get_tone_description(state.get("article_tone", "professional"))
    citation_inst = get_citation_instructions(
        use_inline_links=True,
        use_apa_style=False,
        link_count=state.get("link_count", 5)
    )
    
    # Format improvement prompt
    formatted_prompt = content_improvement_prompt.format(
        original_content=state["original_content"],
        content_analysis=state.get("content_analysis", {}).get("analysis", ""),
        research_results=research_text,
        target_keywords=state.get("target_keywords", ""),
        tone_description=tone_desc,
        word_count=state.get("word_count", 1000),
        link_count=state.get("link_count", 5),
        citation_instructions=citation_inst
    )
    
    # Generate improved content
    response = llm.invoke(formatted_prompt)
    improved_content = response.content
    
    # Track improvements made
    improvements = [
        "Added evidence and citations for claims",
        "Enhanced compliance-friendly language",
        "Integrated target keywords naturally",
        f"Adjusted tone to {state.get('article_tone', 'professional')}",
        f"Added {state.get('link_count', 5)} authoritative sources"
    ]
    
    return {
        "improved_content": improved_content,
        "improvements_made": improvements
    }


def check_compliance(state: ImproveState, config: RunnableConfig) -> Dict[str, Any]:
    """Verify the improved content meets compliance standards."""
    
    # Use the model from state or default to gemini-2.5-flash-lite
    model = state.get("model", "gemini-2.5-flash-lite")
    
    llm = ChatGoogleGenerativeAI(
        model=model,
        temperature=0.3,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )
    
    # Format compliance check prompt
    formatted_prompt = compliance_check_prompt.format(
        improved_content=state["improved_content"],
        issues_to_address=state.get("issues_to_address", "General compliance review")
    )
    
    # Get compliance assessment
    response = llm.invoke(formatted_prompt)
    compliance_assessment = response.content
    
    return {
        "compliance_check": {
            "assessment": compliance_assessment,
            "status": "Compliant" if "compliant" in compliance_assessment.lower() else "Review Needed"
        }
    }


# Build the improvement graph
def create_improvement_graph():
    """Create the LangGraph workflow for content improvement."""
    
    workflow = StateGraph(ImproveState)
    
    # Add nodes
    workflow.add_node("analyze_content", analyze_content)
    workflow.add_node("research_evidence", research_evidence)
    workflow.add_node("improve_content", improve_content)
    workflow.add_node("check_compliance", check_compliance)
    
    # Add edges
    workflow.add_edge(START, "analyze_content")
    workflow.add_edge("analyze_content", "research_evidence")
    workflow.add_edge("research_evidence", "improve_content")
    workflow.add_edge("improve_content", "check_compliance")
    workflow.add_edge("check_compliance", END)
    
    return workflow.compile()


# Create the compiled graph
improve_graph = create_improvement_graph()