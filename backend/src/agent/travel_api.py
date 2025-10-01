"""
Travel API endpoints for Trip Builder and Destination Explorer
Simple implementation using Gemini API directly for MVP
"""

import os
import json
from typing import Dict, Any, AsyncIterator
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

load_dotenv()


def _require_gemini_api_key() -> str:
    """Retrieve the Gemini API key or raise a helpful error."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured. Set it in your environment and restart the service.",
        )
    return api_key


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

    return app
