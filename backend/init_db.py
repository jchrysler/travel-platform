"""Initialize the database tables."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import database modules directly to avoid importing the whole agent package
from agent.database.config import engine, Base
from agent.database import models  # Import to register models

if __name__ == "__main__":
    print("Initializing database...")
    print(f"Database URL pattern: sqlite:///./article_generator.db")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")