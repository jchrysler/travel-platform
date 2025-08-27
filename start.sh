#!/bin/bash
set -e

# Set default port if not provided
export PORT=${PORT:-8000}

echo "Starting application on port $PORT"

# Start the application
python -m uvicorn backend.src.agent.app:app --host 0.0.0.0 --port $PORT