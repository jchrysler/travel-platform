#!/usr/bin/env python3
"""Initialize the database with required tables."""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Import directly without going through agent package
from config import engine
from models import Base


def main():
    """Initialize database tables."""
    print("Initializing database...")
    print(f"Database URL: {os.getenv('DATABASE_URL', 'sqlite:///./article_generator.db')}")
    
    # Create all tables
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully!")
    print("\nTables created:")
    for table_name in Base.metadata.tables.keys():
        print(f"  - {table_name}")


if __name__ == "__main__":
    main()