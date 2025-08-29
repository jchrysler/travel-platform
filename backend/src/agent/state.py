from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict

from langgraph.graph import add_messages
from typing_extensions import Annotated


import operator
from dataclasses import dataclass, field
from typing_extensions import Annotated


class OverallState(TypedDict):
    messages: Annotated[list, add_messages]
    search_query: Annotated[list, operator.add]
    web_research_result: Annotated[list, operator.add]
    sources_gathered: Annotated[list, operator.add]
    initial_search_query_count: int
    max_research_loops: int
    research_loop_count: int
    reasoning_model: str
    article_tone: str
    word_count: int
    link_count: int
    use_inline_links: bool
    use_apa_style: bool
    custom_persona: str
    target_keywords: str


class ReflectionState(TypedDict):
    is_sufficient: bool
    knowledge_gap: str
    follow_up_queries: Annotated[list, operator.add]
    research_loop_count: int
    number_of_ran_queries: int


class Query(TypedDict):
    query: str
    rationale: str


class QueryGenerationState(TypedDict):
    query_list: list[Query]


class WebSearchState(TypedDict):
    search_query: str
    id: str


@dataclass
class SearchStateOutput:
    running_summary: str = field(default=None)  # Final report


class ImproveState(TypedDict):
    """State for content improvement workflow"""
    original_content: str
    issues_to_address: str
    target_keywords: str
    article_tone: str
    model: str
    word_count: int
    link_count: int
    content_analysis: dict
    research_topics: Annotated[list, operator.add]
    research_results: Annotated[list, operator.add]
    improved_content: str
    improvements_made: Annotated[list, operator.add]
    compliance_check: dict
