"""Database models for bulk article processing."""

from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    Float,
    Enum as SQLEnum,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship

try:
    from .config import Base
except ImportError:
    # For standalone scripts
    from config import Base


class BatchStatus(str, Enum):
    """Status options for article batches."""
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class ArticleStatus(str, Enum):
    """Status options for individual articles."""
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"


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
    status = Column(SQLEnum(BatchStatus, name='batch_status'), default=BatchStatus.pending, nullable=False)
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
    
    @property
    def progress_percentage(self) -> float:
        """Calculate batch progress percentage."""
        if self.total_articles == 0:
            return 0.0
        return (self.completed_articles + self.failed_articles) / self.total_articles * 100
    
    @property
    def is_complete(self) -> bool:
        """Check if batch processing is complete."""
        return self.status in [BatchStatus.completed, BatchStatus.failed, BatchStatus.cancelled]


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
    status = Column(SQLEnum(ArticleStatus, name='article_status'), default=ArticleStatus.queued, nullable=False)
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
    
    @property
    def is_complete(self) -> bool:
        """Check if article processing is complete."""
        return self.status in [ArticleStatus.completed, ArticleStatus.failed, ArticleStatus.skipped]
    
    @property
    def processing_time_minutes(self) -> Optional[float]:
        """Get processing time in minutes."""
        if self.processing_duration_seconds:
            return self.processing_duration_seconds / 60
        return None


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
    
    # Indexes for efficient querying
    __table_args__ = (
        # Add composite index for common queries
        # Index('ix_logs_batch_timestamp', 'batch_id', 'timestamp'),
    )


class GuideState(str, Enum):
    """Lifecycle state for research guides."""

    candidate = "candidate"  # Meets automatic quality threshold, pending publication
    needs_review = "needs_review"  # Captured but requires editorial review
    published = "published"  # Published to the explore catalog
    discarded = "discarded"  # Rejected or below quality threshold


class ResearchGuide(Base):
    """User-generated research guide assembled from AI search results."""

    __tablename__ = "research_guides"

    id = Column(Integer, primary_key=True)
    guide_id = Column(String(40), unique=True, nullable=False, index=True)

    destination_slug = Column(String(128), index=True, nullable=False)
    destination_name = Column(String(128), nullable=False)

    title = Column(String(255), nullable=False)
    summary = Column(Text)

    total_sections = Column(Integer, default=0)
    total_word_count = Column(Integer, default=0)
    unique_queries = Column(Integer, default=0)
    quality_score = Column(Float, default=0.0)
    state = Column(SQLEnum(GuideState, name="guide_state"), default=GuideState.needs_review, nullable=False)

    content_signature = Column(String(64), unique=True, nullable=False)
    extra_metadata = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user_fingerprint = Column(String(128))

    sections = relationship(
        "ResearchGuideSection",
        back_populates="guide",
        cascade="all, delete-orphan",
        order_by="ResearchGuideSection.display_order",
    )


class ResearchGuideSection(Base):
    """Sections within a research guide."""

    __tablename__ = "research_guide_sections"

    id = Column(Integer, primary_key=True)
    guide_id = Column(Integer, ForeignKey("research_guides.id", ondelete="CASCADE"), nullable=False)

    display_order = Column(Integer, nullable=False)
    heading = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    source_query = Column(Text, nullable=False)
    raw_response = Column(Text)

    guide = relationship("ResearchGuide", back_populates="sections")

    __table_args__ = (
        UniqueConstraint("guide_id", "display_order", name="uq_guide_section_order"),
    )


# Helpful indexes for reporting/exports
Index("ix_guides_state_destination", ResearchGuide.state, ResearchGuide.destination_slug)
