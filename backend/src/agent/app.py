# mypy: disable - error - code = "no-untyped-def,misc"
import pathlib
from fastapi import FastAPI, Response, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.runnables import RunnableConfig
# CompiledGraph import removed - not needed
from agent.graph import graph
from agent.improve_graph import improve_graph

# Define the FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redirect root to /app
@app.get("/")
async def redirect_to_app():
    return RedirectResponse(url="/app", status_code=302)

# Add health check endpoint
@app.get("/health")
async def health_check():
    print("Health check endpoint called")
    return {"status": "healthy"}

# Add a simple endpoint to run the graph
@app.post("/invoke")
async def invoke_graph(request: dict):
    try:
        config = RunnableConfig()
        result = await graph.ainvoke(request, config=config)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/stream")
async def stream_graph(request: dict):
    try:
        config = RunnableConfig()
        async for chunk in graph.astream(request, config=config):
            yield chunk
    except Exception as e:
        yield {"error": str(e)}

# Add content improvement endpoint
@app.post("/improve")
async def improve_content(request: dict):
    try:
        config = RunnableConfig()
        result = await improve_graph.ainvoke(request, config=config)
        
        # Format the response
        return {
            "improved_content": result.get("improved_content", ""),
            "analysis": {
                "issues_found": result.get("content_analysis", {}).get("analysis", "").split("\n") if result.get("content_analysis") else [],
                "improvements_made": result.get("improvements_made", []),
                "compliance_status": result.get("compliance_check", {}).get("status", "Unknown")
            }
        }
    except Exception as e:
        return {"error": str(e)}


# Determine the frontend build path
def get_frontend_path():
    # Try Docker path first, then fallback to relative path
    docker_build_path = pathlib.Path("/deps/frontend/dist")
    relative_build_path = pathlib.Path(__file__).parent.parent.parent / "frontend/dist"
    
    build_path = docker_build_path if docker_build_path.is_dir() else relative_build_path
    return build_path

# Serve the React app for client-side routing
# This needs to be a regular route, not a mount, to handle all /app/* paths
@app.get("/app")
@app.get("/app/{full_path:path}")
async def serve_frontend(request: Request, full_path: str = ""):
    """Serve the React frontend for all /app/* routes."""
    build_path = get_frontend_path()
    
    # First, try to serve the exact file if it exists (for assets)
    if full_path:
        file_path = build_path / full_path
        if file_path.is_file() and file_path.suffix in ['.js', '.css', '.map', '.ico', '.png', '.jpg', '.svg']:
            return FileResponse(file_path)
    
    # For all other routes, serve index.html (for client-side routing)
    index_path = build_path / "index.html"
    if index_path.is_file():
        return FileResponse(index_path)
    
    return Response(
        "Frontend not built. Run 'npm run build' in the frontend directory.",
        media_type="text/plain",
        status_code=503,
    )

# Mount static files for assets
build_path = get_frontend_path()
if build_path.is_dir() and (build_path / "assets").is_dir():
    app.mount("/app/assets", StaticFiles(directory=build_path / "assets"), name="static")
