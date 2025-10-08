"""
Travel API endpoints for Trip Builder and Destination Explorer
Simple implementation using Gemini API directly for MVP
"""

import base64
import io
import json
import os
import re
from datetime import datetime
from functools import lru_cache
from typing import Dict, Any, AsyncIterator, List, Optional

from fastapi import Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from google.genai import Client, types
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from PIL import Image, ImageOps

from agent.database.config import get_db
from agent.database.models import DestinationHeroImage, GuideState
from agent.database.operations import (
    save_research_guide,
    GuideSaveDecision,
    get_destination_suggestions,
    store_destination_suggestions,
    list_recent_guides,
    upsert_destination_hero_image,
    list_destination_hero_images,
    get_destination_hero_image,
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


class HeroImageGeneratePayload(BaseModel):
    destination: str = Field(..., min_length=1)
    prompt_hint: Optional[str] = Field(None, alias="promptHint")
    prompt_override: Optional[str] = Field(None, alias="promptOverride")
    model: Optional[str] = Field(None, alias="model")

    class Config:
        allow_population_by_field_name = True


class HeroImageResponse(BaseModel):
    destination: str
    destination_slug: str = Field(..., serialization_alias="destinationSlug")
    prompt: str
    prompt_version: str = Field(..., serialization_alias="promptVersion")
    width: int
    height: int
    image_webp: str = Field(..., serialization_alias="imageWebp")
    image_jpeg: Optional[str] = Field(None, serialization_alias="imageJpeg")
    updated_at: datetime = Field(..., serialization_alias="updatedAt")

    class Config:
        populate_by_name = True


class HeroImageListResponse(BaseModel):
    items: List[HeroImageResponse]
    total: int


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


DEFAULT_HERO_PROMPT_TEMPLATE = (
    "A 16:9 journalistic professional travel photo of {destination} that could be used in "
    "Travel & Leisure or Condé Nast. A high quality travel photo that captures the essence "
    "of the destination. No text, no overlays, no graphic elements—just an authentic "
    "photographic image."
)

HERO_PROMPT_VERSION = "v2-journalistic"
HERO_MODEL_NAME = "gemini-2.5-flash-image"
_SLUGIFY_PATTERN = re.compile(r"[^a-z0-9]+")


@lru_cache(maxsize=1)
def _get_image_client() -> Client:
    return Client(api_key=_require_gemini_api_key())


def _slugify_destination(value: str) -> str:
    slug = _SLUGIFY_PATTERN.sub("-", value.lower()).strip("-")
    return slug or "destination"


def _build_hero_prompt(destination: str, prompt_hint: Optional[str], prompt_override: Optional[str]) -> Dict[str, str]:
    if prompt_override and prompt_override.strip():
        prompt = prompt_override.strip()
        base_prompt = DEFAULT_HERO_PROMPT_TEMPLATE.format(destination=destination)
    else:
        base_prompt = DEFAULT_HERO_PROMPT_TEMPLATE.format(destination=destination)
        prompt = base_prompt
        if prompt_hint and prompt_hint.strip():
            prompt = f"{prompt} {prompt_hint.strip()}"
    return {"prompt": prompt, "base_prompt": base_prompt}


def _encode_data_url(mime_type: str, data: bytes) -> str:
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _prepare_travel_hero_image(image: Image.Image) -> tuple[int, int, bytes, bytes]:
    target_size = (1920, 1080)
    prepared = ImageOps.fit(
        image.convert("RGB"),
        target_size,
        method=Image.Resampling.LANCZOS,
    )

    webp_buffer = io.BytesIO()
    prepared.save(webp_buffer, format="WEBP", quality=82, method=6)
    webp_bytes = webp_buffer.getvalue()

    jpeg_buffer = io.BytesIO()
    prepared.save(jpeg_buffer, format="JPEG", quality=88, optimize=True, progressive=True)
    jpeg_bytes = jpeg_buffer.getvalue()

    return prepared.width, prepared.height, webp_bytes, jpeg_bytes


async def _generate_travel_hero_image(prompt: str, model_name: str) -> Dict[str, Any]:
    client = _get_image_client()

    def _invoke_model() -> Image.Image:
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="16:9"),
            ),
        )

        for part in getattr(response, "parts", []) or []:
            inline_data = getattr(part, "inline_data", None)
            if inline_data is not None:
                # Convert Gemini inline_data bytes to PIL Image
                image_bytes = getattr(inline_data, "data", None)
                if image_bytes:
                    return Image.open(io.BytesIO(image_bytes))

        raise RuntimeError("Image generation returned no inline image data")

    raw_image = await run_in_threadpool(_invoke_model)
    width, height, webp_bytes, jpeg_bytes = await run_in_threadpool(_prepare_travel_hero_image, raw_image)

    return {
        "width": width,
        "height": height,
        "webp_bytes": webp_bytes,
        "jpeg_bytes": jpeg_bytes,
    }


def _serialize_hero_image(record: DestinationHeroImage) -> HeroImageResponse:
    return HeroImageResponse(
        destination=record.destination_name,
        destination_slug=record.destination_slug,
        prompt=record.prompt,
        prompt_version=record.prompt_version,
        width=record.width,
        height=record.height,
        image_webp=_encode_data_url("image/webp", record.image_webp),
        image_jpeg=_encode_data_url("image/jpeg", record.image_jpeg) if record.image_jpeg else None,
        updated_at=record.updated_at,
    )


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

    @app.get("/api/hero-images", response_model=HeroImageListResponse)
    async def list_hero_images_endpoint(limit: int = 50, db: Session = Depends(get_db)) -> HeroImageListResponse:
        bounded_limit = max(1, min(limit, 100))
        records = list_destination_hero_images(db, limit=bounded_limit)
        items = [_serialize_hero_image(record) for record in records]
        return HeroImageListResponse(items=items, total=len(items))

    @app.get("/api/hero-images/{destination_slug}", response_model=HeroImageResponse)
    async def get_hero_image(destination_slug: str, db: Session = Depends(get_db)) -> HeroImageResponse:
        record = get_destination_hero_image(db, destination_slug=destination_slug)
        if not record:
            raise HTTPException(status_code=404, detail="Hero image not found")
        return _serialize_hero_image(record)

    @app.post("/api/hero-images", response_model=HeroImageResponse)
    async def generate_hero_image_endpoint(
        payload: HeroImageGeneratePayload,
        db: Session = Depends(get_db),
    ) -> HeroImageResponse:
        destination_name = payload.destination.strip()
        if not destination_name:
            raise HTTPException(status_code=400, detail="Destination is required")

        destination_slug = _slugify_destination(destination_name)
        prompts = _build_hero_prompt(destination_name, payload.prompt_hint, payload.prompt_override)
        model_name = (payload.model or HERO_MODEL_NAME).strip() or HERO_MODEL_NAME

        try:
            generation = await _generate_travel_hero_image(prompts["prompt"], model_name)
        except Exception as exc:  # pragma: no cover - external API failure path
            raise HTTPException(status_code=502, detail=f"Hero image generation failed: {exc}") from exc

        metadata = {
            "model": model_name,
            "prompt_hint": payload.prompt_hint,
            "prompt_override": payload.prompt_override,
            "base_prompt": prompts["base_prompt"],
            "generated_at": datetime.utcnow().isoformat(),
        }

        record = upsert_destination_hero_image(
            db,
            destination_name=destination_name,
            destination_slug=destination_slug,
            prompt=prompts["prompt"],
            prompt_version=HERO_PROMPT_VERSION,
            width=generation["width"],
            height=generation["height"],
            image_webp=generation["webp_bytes"],
            image_jpeg=generation["jpeg_bytes"],
            metadata=metadata,
        )

        return _serialize_hero_image(record)

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
