# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a fullstack article generation application built with:
- **Frontend**: React + Vite + TypeScript with Tailwind CSS and Shadcn UI components
- **Backend**: LangGraph agent powered by Google Gemini models for web research and article writing

The core architecture follows an article creation workflow:
1. Generate targeted search queries from user topic (`generate_query` node)
2. Perform parallel web research using Google Search API (`web_research` node)  
3. Evaluate research completeness and identify content gaps (`reflection` node)
4. Either gather additional sources or write the final article (`evaluate_research` routing)
5. Create a well-formatted 750-1200 word article with citations (`finalize_answer` node)

Key files:
- `backend/src/agent/graph.py` - Main LangGraph state machine defining the article creation workflow
- `backend/src/agent/state.py` - State definitions with article_tone configuration
- `backend/src/agent/prompts.py` - Specialized prompts for article generation and research
- `frontend/src/App.tsx` - Main React app with streaming integration and article generation UI
- `frontend/src/components/WelcomeScreen.tsx` - Article Generator welcome interface

## Environment Setup

Required environment variables:
- `GEMINI_API_KEY` - Google Gemini API key (required for backend)
- `LANGSMITH_API_KEY` - LangSmith API key (required for production deployment)

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
docker build -t gemini-fullstack-langgraph -f Dockerfile .
GEMINI_API_KEY=<key> LANGSMITH_API_KEY=<key> docker-compose up
```

Production server runs on port 8123 and serves the frontend build at `/app/`.

## Configuration

LangGraph configuration is in `backend/langgraph.json`:
- Graph entry point: `./src/agent/graph.py:graph`
- HTTP app: `./src/agent/app.py:app`

The article generator supports configurable parameters:
- `initial_search_query_count` - Number of initial search queries (1-3 based on effort level)
- `max_research_loops` - Maximum research iterations (1-3 based on effort level)
- `reasoning_model` - Gemini model for article writing and reflection steps
- `query_generator_model` - Gemini model for search query generation
- `article_tone` - Writing tone: professional, casual, academic, or expert

## API Integration

Frontend connects to backend via LangGraph SDK streaming:
- Development: `http://localhost:2024`
- Production: `http://localhost:8123`

The streaming interface provides real-time updates on article generation progress:
- "Researching Article Topics" - Query generation phase
- "Gathering Article Sources" - Web research phase  
- "Evaluating Article Content" - Research completeness assessment
- "Writing Article" - Final article creation with formatting and citations