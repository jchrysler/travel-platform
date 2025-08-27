# mypy: disable - error - code = "no-untyped-def,misc"
import pathlib
from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.runnables import RunnableConfig
# CompiledGraph import removed - not needed
from agent.graph import graph

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


def create_frontend_router(build_dir="../frontend/dist"):
    """Creates a router to serve the React frontend.

    Args:
        build_dir: Path to the React build directory relative to this file.

    Returns:
        A Starlette application serving the frontend.
    """
    # Try Docker path first, then fallback to relative path
    docker_build_path = pathlib.Path("/deps/frontend/dist")
    relative_build_path = pathlib.Path(__file__).parent.parent.parent / build_dir
    
    build_path = docker_build_path if docker_build_path.is_dir() else relative_build_path

    if not build_path.is_dir() or not (build_path / "index.html").is_file():
        print(
            f"WARN: Frontend build directory not found or incomplete at {build_path}. Serving frontend will likely fail."
        )
        # Return a dummy router if build isn't ready
        from starlette.routing import Route

        async def dummy_frontend(request):
            return Response(
                "Frontend not built. Run 'npm run build' in the frontend directory.",
                media_type="text/plain",
                status_code=503,
            )

        return Route("/{path:path}", endpoint=dummy_frontend)

    return StaticFiles(directory=build_path, html=True)


# Mount the frontend under /app to not conflict with the LangGraph API routes
app.mount(
    "/app",
    create_frontend_router(),
    name="frontend",
)
