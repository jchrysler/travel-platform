"""
Travel API endpoints for Trip Builder and Destination Explorer
Simple implementation using Gemini API directly for MVP
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, AsyncIterator, List, Optional
from fastapi import HTTPException, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from agent.database.config import get_db
from agent.database.models import GuideState
from agent.database.operations import (
    save_research_guide,
    GuideSaveDecision,
    get_destination_suggestions,
    store_destination_suggestions,
    list_recent_guides,
)

load_dotenv()


class GuideSectionPayload(BaseModel):
    title: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    query: str = Field(..., min_length=1)
    raw_response: Optional[str] = Field(None, alias="rawResponse")

    class Config:
        allow_population_by_field_name = True


class GuideSubmissionPayload(BaseModel):
    destination_name: str = Field(..., alias="destination", min_length=1)
    destination_slug: str = Field(..., alias="destinationSlug", min_length=1)
    title: str = Field(..., min_length=1)
    description: Optional[str] = Field(None, alias="description")
    sections: List[GuideSectionPayload]
    total_searches: int = Field(..., alias="totalSearches", ge=1)
    metadata: Optional[Dict[str, Any]] = None
    user_fingerprint: Optional[str] = Field(None, alias="userFingerprint")

    class Config:
        allow_population_by_field_name = True


class GuideSaveResponse(BaseModel):
    status: GuideSaveDecision
    guide_id: Optional[str] = None
    state: Optional[str] = None
    quality_score: Optional[float] = None
    reason: Optional[str] = None


class DestinationSuggestionsResponse(BaseModel):
    destination: str
    destinationSlug: str = Field(..., alias="destination_slug")
    suggestions: List[str]
    cached: bool = False


class AdminGuideSummary(BaseModel):
    guide_id: str
    destination: str
    state: GuideState
    quality_score: float
    total_sections: int
    total_word_count: int
    created_at: datetime


def _require_gemini_api_key() -> str:
    """Retrieve the Gemini API key or raise a helpful error."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured. Set it in your environment and restart the service.",
        )
    return api_key


def _humanize_slug(slug: str) -> str:
    return slug.replace("-", " ").title()


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped[3:]
        stripped = stripped.lstrip()
        if stripped.lower().startswith("json"):
            stripped = stripped[4:]
        stripped = stripped.lstrip()
        if stripped.endswith("```"):
            stripped = stripped[:-3]
    return stripped.strip()


def _clean_suggestion_text(text: str) -> str:
    cleaned = _strip_code_fences(text)
    cleaned = cleaned.replace("\u201d", '"').replace("\u201c", '"')
    cleaned = cleaned.replace("\u2019", "'")
    cleaned = cleaned.lstrip("-• ").strip()
    cleaned = cleaned.strip('"\'')
    cleaned = cleaned.rstrip(",")
    return cleaned.strip()


async def _generate_destination_suggestions(destination: str, api_key: str) -> List[str]:
    """Call Gemini to generate destination-specific suggested searches."""

    prompt = (
        "You are an expert travel concierge. Provide 8 highly engaging search queries "
        "a traveler might ask when planning a trip to {city}. Each query should be unique, actionable, "
        "and reflect current traveler intent across categories like restaurants, hotels, experiences, events, "
        "and whimsical ideas. Keep them under 80 characters, avoid duplicates, and do not number them. "
        "Return them as a JSON array of strings."
    ).format(city=destination)

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp",
        temperature=0.6,
        max_retries=2,
        api_key=api_key,
    )

    result = await llm.ainvoke(prompt)
    raw_content = _strip_code_fences(result.content)

    try:
        parsed = json.loads(raw_content)
        if isinstance(parsed, list):
            cleaned = [
                _clean_suggestion_text(item)
                for item in parsed
                if isinstance(item, str) and _clean_suggestion_text(item)
            ]
            if cleaned:
                return cleaned[:8]
    except (json.JSONDecodeError, AttributeError):
        pass

    fallback = []
    for line in raw_content.splitlines():
        cleaned = _clean_suggestion_text(line)
        if cleaned:
            fallback.append(cleaned)
    return fallback[:8]


async def generate_trip_itinerary(
    description: str,
    duration: int,
    interests: str = "",
    travel_style: str = "comfort",
    api_key: str | None = None,
) -> AsyncIterator[str]:
    """Generate a detailed trip itinerary using Gemini"""

    style_descriptions = {
        "budget": "budget-conscious with hostels, street food, and public transport",
        "comfort": "mid-range with comfortable hotels and nice restaurants",
        "luxury": "premium with luxury hotels and fine dining"
    }

    prompt = f"""You are an expert travel planner who creates detailed, personalized itineraries.

Create a {duration}-day itinerary for the following trip:
{description}

Travel Style: {style_descriptions.get(travel_style, "comfortable")}
Additional Interests/Requirements: {interests if interests else "None specified"}

Format the response as a day-by-day itinerary with:
- Clear day titles that capture the essence of each day
- Morning activities (8:00 AM - 12:00 PM) with specific times
- Afternoon activities (12:00 PM - 5:00 PM) with specific times
- Evening activities (5:00 PM - 10:00 PM) with specific times
- Specific restaurant recommendations with expected costs
- Transportation details between locations
- Practical tips for each day
- Estimated daily costs per person

Include:
- Specific addresses or landmarks for navigation
- Opening hours and best times to visit
- Booking requirements or reservations needed
- Alternative options for weather or crowds
- Local customs or etiquette tips

Make the itinerary immersive, practical, and exciting. Balance must-see attractions with hidden gems.
Include specific walking routes and approximate distances."""

    key = api_key or _require_gemini_api_key()

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp",
        temperature=0.8,
        max_retries=2,
        streaming=True,
        api_key=key,
    )

    try:
        # Stream the response
        async for chunk in llm.astream([HumanMessage(content=prompt)]):
            if chunk.content:
                yield f"data: {json.dumps({'content': chunk.content})}\n\n"

        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def explore_destination(
    city: str,
    query: str,
    api_key: str | None = None,
) -> AsyncIterator[str]:
    """Answer travel queries about a specific destination"""

    prompt = f"""You are a knowledgeable local expert for {city} who provides detailed, practical travel advice.

Answer this travel query: "{query}"

Provide:
1. A direct, comprehensive answer to the question
2. Specific recommendations with names and addresses
3. Current practical information (opening hours, prices, booking requirements)
4. Insider tips that tourists might not know
5. Alternative options or related suggestions
6. Important logistics or transportation details

Format your response to be scannable with clear sections.
Include specific examples and avoid generic advice.
If mentioning restaurants, attractions, or venues, provide:
- Full name and neighborhood/district
- Approximate costs
- Best times to visit
- How to get there
- What makes it special

Make your response helpful, specific, and actionable."""

    key = api_key or _require_gemini_api_key()

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp",
        temperature=0.7,
        max_retries=2,
        streaming=True,
        api_key=key,
    )

    try:
        async for chunk in llm.astream([HumanMessage(content=prompt)]):
            if chunk.content:
                yield f"data: {json.dumps({'content': chunk.content})}\n\n"

        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


def create_travel_routes(app):
    """Add travel-specific routes to the FastAPI app"""

    @app.post("/api/travel/generate-trip")
    async def generate_trip(request_data: Dict[str, Any]):
        """Generate a trip itinerary"""
        description = request_data.get("description", "")
        duration = request_data.get("duration", 5)
        interests = request_data.get("interests", "")
        travel_style = request_data.get("travelStyle", "comfort")

        if not description:
            raise HTTPException(status_code=400, detail="Trip description is required")

        api_key = _require_gemini_api_key()

        return StreamingResponse(
            generate_trip_itinerary(description, duration, interests, travel_style, api_key=api_key),
            media_type="text/event-stream"
        )

    @app.post("/api/travel/explore")
    async def explore(request_data: Dict[str, Any]):
        """Explore a destination with a specific query"""
        city = request_data.get("city", "")
        query = request_data.get("query", "")

        if not city or not query:
            raise HTTPException(status_code=400, detail="City and query are required")

        api_key = _require_gemini_api_key()

        return StreamingResponse(
            explore_destination(city, query, api_key=api_key),
            media_type="text/event-stream"
        )

    @app.post("/api/travel/guides", response_model=GuideSaveResponse)
    async def store_guide(
        payload: GuideSubmissionPayload,
        db: Session = Depends(get_db),
    ) -> GuideSaveResponse:
        """Persist a high-quality research guide for future publishing."""

        sections_payload = [
            {
                "title": section.title.strip(),
                "body": section.body.strip(),
                "query": section.query.strip(),
                "raw_response": (section.raw_response or section.body).strip(),
            }
            for section in payload.sections
            if section.body.strip()
        ]

        decision, guide, info = save_research_guide(
            db,
            destination_name=payload.destination_name.strip(),
            destination_slug=payload.destination_slug.strip().lower(),
            title=payload.title,
            summary=payload.description,
            sections=sections_payload,
            total_searches=payload.total_searches,
            metadata=payload.metadata,
            user_fingerprint=payload.user_fingerprint,
        )

        if decision == GuideSaveDecision.error:
            raise HTTPException(status_code=500, detail="Failed to store guide")

        response = GuideSaveResponse(
            status=decision,
            guide_id=guide.guide_id if guide else None,
            state=guide.state.value if guide else None,
            quality_score=info.get("quality_score") if guide else None,
            reason=info.get("reason"),
        )
        return response

    @app.get("/api/travel/suggestions/{destination_slug}", response_model=DestinationSuggestionsResponse)
    async def get_suggestions(destination_slug: str, db: Session = Depends(get_db)) -> DestinationSuggestionsResponse:
        record = get_destination_suggestions(db, destination_slug=destination_slug)
        if record:
            return DestinationSuggestionsResponse(
                destination=record.destination_name,
                destination_slug=record.destination_slug,
                suggestions=record.suggestions,
                cached=True,
            )

        api_key = _require_gemini_api_key()
        destination_name = _humanize_slug(destination_slug)

        suggestions = await _generate_destination_suggestions(destination_name, api_key)
        if not suggestions:
            suggestions = [
                f"Best things to do in {destination_name}",
                f"Where to stay in {destination_name}",
                f"Top restaurants in {destination_name}",
            ]

        store_destination_suggestions(
            db,
            destination_name=destination_name,
            destination_slug=destination_slug,
            suggestions=suggestions,
            metadata={"generated_at": datetime.utcnow().isoformat()},
        )

        return DestinationSuggestionsResponse(
            destination=destination_name,
            destination_slug=destination_slug,
            suggestions=suggestions,
            cached=False,
        )

    @app.get("/admin/guides", response_model=List[AdminGuideSummary])
    async def list_guides(state: Optional[GuideState] = None, db: Session = Depends(get_db)) -> List[AdminGuideSummary]:
        records = list_recent_guides(db, state=state)
        return [
            AdminGuideSummary(
                guide_id=guide.guide_id,
                destination=guide.destination_name,
                state=guide.state,
                quality_score=guide.quality_score,
                total_sections=guide.total_sections,
                total_word_count=guide.total_word_count,
                created_at=guide.created_at,
            )
            for guide in records
        ]

    return app
