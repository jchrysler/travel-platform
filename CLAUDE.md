# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a fullstack travel planning application built with:
- **Frontend**: React + Vite + TypeScript with Tailwind CSS and Shadcn UI components
- **Backend**: LangGraph agent powered by Google Gemini models for travel research and planning

The core architecture follows a travel research workflow:
1. Generate targeted search queries from user travel requests (`generate_query` node)
2. Perform parallel web research using Google Search API (`web_research` node)
3. Evaluate research completeness and identify information gaps (`reflection` node)
4. Either gather additional sources or create final response (`evaluate_research` routing)
5. Create comprehensive travel recommendations with current information (`finalize_answer` node)

Key files:
- `backend/src/agent/travel_research_graph.py` - Main LangGraph state machine for travel research
- `backend/src/agent/travel_api.py` - Simple Gemini-powered travel endpoints
- `backend/src/agent/state.py` - State definitions for travel workflows
- `backend/src/agent/prompts.py` - Travel-specific prompts for research and recommendations
- `frontend/src/App.tsx` - Main React app with travel routes
- `frontend/src/pages/TravelHub.tsx` - Travel platform home page
- `frontend/src/pages/TripBuilder.tsx` - Natural language trip planning interface
- `frontend/src/pages/DestinationExplorer.tsx` - Destination research and exploration

## Environment Setup

Required environment variables:
- `GEMINI_API_KEY` - Google Gemini API key (required for backend)
- `LANGSMITH_API_KEY` - LangSmith API key (required for production deployment)
- `GOOGLE_MAPS_API_KEY` - Google Maps API key (future: place validation)

Create `backend/.env` file with these keys before running.

## Development Commands

**Start development servers:**
```bash
make dev                # Both frontend and backend
make dev-frontend       # Frontend only (port 5173)
make dev-backend        # Backend only (port 2024)
```

**Frontend commands:**
```bash
cd frontend
npm run dev             # Development server
npm run build           # Production build
npm run lint            # ESLint
```

**Backend commands:**
```bash
cd backend
pip install .           # Install dependencies
langgraph dev           # Development server with LangGraph UI
make test               # Run tests with pytest
make lint               # Run ruff linting and mypy
make format             # Format code with ruff
```

## Production Deployment

Uses Docker with docker-compose for production:
```bash
docker build -t travel-platform -f Dockerfile .
GEMINI_API_KEY=<key> LANGSMITH_API_KEY=<key> docker-compose up
```

Production server runs on port 8123 and serves the frontend build at `/app/`.

## Configuration

LangGraph configuration is in `backend/langgraph.json`:
- Graph entry point: `./src/agent/travel_research_graph.py:graph`
- HTTP app: `./src/agent/app.py:app`

The travel research supports configurable parameters:
- `initial_search_query_count` - Number of initial search queries (1-3)
- `max_research_loops` - Maximum research iterations (1-3)
- `reasoning_model` - Gemini model for travel recommendations
- `query_generator_model` - Gemini model for search query generation

## API Integration

Frontend connects to backend via:
- Development: `http://localhost:2024`
- Production: `http://localhost:8123`

Travel-specific endpoints:
- `/api/travel/generate-trip` - Generate trip itineraries
- `/api/travel/explore` - Explore destinations with queries

The streaming interface provides real-time updates on research progress:
- "Researching Travel Options" - Query generation phase
- "Gathering Current Information" - Web research phase
- "Evaluating Completeness" - Research assessment
- "Creating Recommendations" - Final travel guide generation

## Future: Google Maps Integration

Planned integration with Google Maps Platform for:
- Place validation and enrichment
- Real-time business hours and availability
- Photos, reviews, and ratings
- Interactive maps in trip planning
- Turn-by-turn navigation for itineraries

Place validation will work asynchronously:
1. Extract place names from AI responses
2. Validate against Google Places API in background
3. Store enriched data in local database
4. Build curated destination directories over time