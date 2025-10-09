#!/usr/bin/env python3
"""Create database tables in production PostgreSQL."""

import os
import sys
from pathlib import Path

# Set the database URL
os.environ['DATABASE_URL'] = "postgresql://postgres:wjcCCGROERJGvpcuSEJHPtbZUvTpEcxX@ballast.proxy.rlwy.net:54519/railway"

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from sqlalchemy import create_engine, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Import just what we need for models
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON, Float, Enum as SQLEnum, LargeBinary
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

# Create base
Base = declarative_base()

# Define models directly (copy from models.py)
class BatchStatus(str, Enum):
    """Status options for article batches."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ArticleStatus(str, Enum):
    """Status options for individual articles."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class ArticleBatch(Base):
    """Represents a batch of articles for bulk processing."""
    
    __tablename__ = "article_batches"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(String(100), index=True, nullable=False)
    
    # Batch metadata
    name = Column(String(255), nullable=False)
    description = Column(Text)
    uploaded_filename = Column(String(255))
    
    # Status tracking
    status = Column(SQLEnum(BatchStatus), default=BatchStatus.PENDING, nullable=False)
    total_articles = Column(Integer, default=0)
    completed_articles = Column(Integer, default=0)
    failed_articles = Column(Integer, default=0)
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Configuration (stored as JSON for flexibility)
    default_config = Column(JSON)  # Default settings for articles without specific config
    
    # Relationships
    articles = relationship("BatchArticle", back_populates="batch", cascade="all, delete-orphan")

class BatchArticle(Base):
    """Represents an individual article in a batch."""
    
    __tablename__ = "batch_articles"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("article_batches.id"), nullable=False)
    
    # Article parameters (from CSV)
    topic = Column(Text, nullable=False)
    keywords = Column(Text)  # Comma-separated
    tone = Column(String(50), default="professional")
    word_count = Column(Integer, default=1000)
    custom_persona = Column(Text)
    link_count = Column(Integer, default=5)
    use_inline_links = Column(Integer, default=1)  # SQLite doesn't have native boolean
    use_apa_style = Column(Integer, default=0)
    
    # Processing status
    status = Column(SQLEnum(ArticleStatus), default=ArticleStatus.QUEUED, nullable=False)
    processing_attempts = Column(Integer, default=0)
    error_message = Column(Text)
    
    # Generated content
    generated_title = Column(Text)
    generated_content = Column(Text)
    generated_meta_description = Column(Text)
    word_count_actual = Column(Integer)
    
    # Timing
    queued_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    processing_duration_seconds = Column(Float)
    
    # Metadata
    row_index = Column(Integer)  # Original row number from CSV
    custom_metadata = Column(JSON)  # Any additional fields from CSV
    
    # Relationships
    batch = relationship("ArticleBatch", back_populates="articles")

class ProcessingLog(Base):
    """Log entries for batch processing events."""
    
    __tablename__ = "processing_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("article_batches.id"), nullable=False)
    article_id = Column(Integer, ForeignKey("batch_articles.id"))
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    level = Column(String(20))  # INFO, WARNING, ERROR
    message = Column(Text)
    details = Column(JSON)  # Additional structured data


class DestinationHeroImage(Base):
    """Stores generated hero imagery per destination."""

    __tablename__ = "destination_hero_images"

    id = Column(Integer, primary_key=True)
    destination_slug = Column(String(128), unique=True, nullable=False, index=True)
    destination_name = Column(String(128), nullable=False)

    prompt = Column(Text, nullable=False)
    prompt_version = Column(String(32), default="poc-v1", nullable=False)

    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)

    image_webp = Column(LargeBinary, nullable=False)
    image_jpeg = Column(LargeBinary)
    image_webp_size = Column(Integer, nullable=False)
    image_jpeg_size = Column(Integer)

    headline = Column(Text)
    subheadline = Column(Text)
    cta_label = Column(String(160))

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    extra_metadata = Column(JSON)

def main():
    """Create all tables in production database."""
    DATABASE_URL = os.environ['DATABASE_URL']
    
    print(f"Connecting to database...")
    print(f"Host: ballast.proxy.rlwy.net:54519")
    print(f"Database: railway")
    
    # Create engine
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    
    # Test connection
    try:
        with engine.connect() as conn:
            print("✓ Successfully connected to database")
    except Exception as e:
        print(f"✗ Failed to connect: {e}")
        return
    
    # Check existing tables
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    print(f"\nExisting tables: {existing_tables}")
    
    # Create tables
    print("\nCreating tables...")
    Base.metadata.create_all(bind=engine)
    
    # Verify tables were created
    inspector = inspect(engine)
    new_tables = inspector.get_table_names()
    
    print("\n✓ Tables created successfully:")
    for table_name in Base.metadata.tables.keys():
        if table_name in new_tables:
            print(f"  ✓ {table_name}")
        else:
            print(f"  ✗ {table_name} (failed)")
    
    # Show table counts
    print("\nTable row counts:")
    with engine.connect() as conn:
        for table_name in ['article_batches', 'batch_articles', 'processing_logs']:
            try:
                result = conn.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = result.scalar()
                print(f"  {table_name}: {count} rows")
            except:
                pass
    
    print("\n✅ Database setup complete!")

if __name__ == "__main__":
    main()
