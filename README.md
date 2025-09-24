# AI Travel Platform

An intelligent travel planning platform that combines real-time web research with AI-powered recommendations to create personalized itineraries and destination guides.

## Features

### Core Capabilities
- **Trip Builder**: Natural language trip planning with detailed day-by-day itineraries
- **Destination Explorer**: Interactive exploration of any destination with AI-powered insights
- **Real-Time Research**: Current prices, availability, and travel conditions via web search
- **Smart Recommendations**: Validated place recommendations with Google Maps integration (coming soon)

### Technical Highlights
- **LangGraph Backend**: Orchestrates web research for current travel information
- **Streaming Responses**: Real-time content generation for smooth user experience
- **Place Validation**: Background validation of recommendations via Google Places API (planned)
- **Data Enrichment**: Builds a curated database of verified places over time

## Tech Stack

### Frontend
- React + TypeScript
- Vite for fast development
- Tailwind CSS + Shadcn UI components
- React Router for navigation

### Backend
- FastAPI + Python
- LangGraph for orchestrating research workflows
- Google Gemini for AI generation
- Google Search API for real-time information

## Getting Started

### Prerequisites
- Node.js (LTS version)
- Python 3.11+
- Google Gemini API key
- (Optional) Google Maps API key for place validation

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/jchrysler/travel-platform.git
cd travel-platform
```

2. Set up backend environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

3. Create backend `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key
# Optional for production
LANGSMITH_API_KEY=your_langsmith_api_key
# Future: Google Maps integration
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

4. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Development

Run both frontend and backend:
```bash
# From root directory
make dev
```

Or run separately:

Backend:
```bash
cd backend
langgraph dev  # Includes LangGraph UI on port 8123
```

Frontend:
```bash
cd frontend
npm run dev  # Runs on port 5173
```

## Architecture

### System Flow
```
User Query → LangGraph Orchestration → Web Research + AI Generation → Streaming Response
                                              ↓
                                    Place Validation (async)
                                              ↓
                                    Database Enrichment
```

### Key Components

- **Travel Research Graph**: Orchestrates multi-step research workflows
- **Web Search Integration**: Fetches current travel information
- **Place Validator**: Validates recommendations against Google Places (planned)
- **Streaming API**: Real-time content delivery to frontend

## Roadmap

### Phase 1: Core Platform ✅
- Remove content generation features
- Focus on travel-specific functionality
- Adapt LangGraph for travel research

### Phase 2: Google Maps Integration (Current)
- Place validation system
- Rich place data (photos, reviews, hours)
- Interactive maps in trip builder

### Phase 3: Data Intelligence
- Track saved places and preferences
- Build curated destination guides
- Generate popularity metrics

### Phase 4: Enhanced Features
- User accounts and personalization
- Collaborative trip planning
- Offline access to saved itineraries
- Mobile application

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please use the GitHub issue tracker.