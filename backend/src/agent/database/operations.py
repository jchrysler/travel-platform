"""Database operations for bulk article processing."""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from .models import ArticleBatch, BatchArticle, ProcessingLog, BatchStatus, ArticleStatus


def create_batch(
    db: Session,
    user_id: str,
    name: str,
    articles_data: List[Dict[str, Any]],
    description: Optional[str] = None,
    uploaded_filename: Optional[str] = None,
    default_config: Optional[Dict[str, Any]] = None
) -> ArticleBatch:
    """Create a new article batch with articles."""
    
    # Generate unique batch ID
    batch_id = f"batch_{uuid.uuid4().hex[:8]}_{datetime.utcnow().strftime('%Y%m%d')}"
    
    # Create batch
    batch = ArticleBatch(
        batch_id=batch_id,
        user_id=user_id,
        name=name,
        description=description,
        uploaded_filename=uploaded_filename,
        total_articles=len(articles_data),
        default_config=default_config or {},
        status=BatchStatus.pending
    )
    
    db.add(batch)
    db.flush()  # Get the batch.id without committing
    
    # Create articles
    for idx, article_data in enumerate(articles_data):
        article = BatchArticle(
            batch_id=batch.id,
            topic=article_data.get("topic", ""),
            keywords=article_data.get("keywords", ""),
            tone=article_data.get("tone", "professional"),
            word_count=article_data.get("word_count", 1000),
            custom_persona=article_data.get("custom_persona", ""),
            link_count=article_data.get("link_count", 5),
            use_inline_links=1 if article_data.get("use_inline_links", True) else 0,
            use_apa_style=1 if article_data.get("use_apa_style", False) else 0,
            row_index=idx + 1,
            custom_metadata=article_data.get("custom_metadata", {}),
            status=ArticleStatus.queued
        )
        db.add(article)
    
    # Log batch creation
    log_entry = ProcessingLog(
        batch_id=batch.id,
        level="INFO",
        message=f"Batch created with {len(articles_data)} articles",
        details={"article_count": len(articles_data), "user_id": user_id}
    )
    db.add(log_entry)
    
    db.commit()
    db.refresh(batch)
    
    return batch


def get_batch(db: Session, batch_id: str) -> Optional[ArticleBatch]:
    """Get a batch by ID."""
    return db.query(ArticleBatch).filter(ArticleBatch.batch_id == batch_id).first()


def get_user_batches(
    db: Session, 
    user_id: str, 
    skip: int = 0, 
    limit: int = 20,
    status: Optional[BatchStatus] = None
) -> List[ArticleBatch]:
    """Get batches for a user."""
    query = db.query(ArticleBatch).filter(ArticleBatch.user_id == user_id)
    
    if status:
        query = query.filter(ArticleBatch.status == status)
    
    return query.order_by(ArticleBatch.created_at.desc()).offset(skip).limit(limit).all()


def get_next_queued_article(db: Session, batch_id: int) -> Optional[BatchArticle]:
    """Get the next queued article from a batch."""
    return db.query(BatchArticle).filter(
        BatchArticle.batch_id == batch_id,
        BatchArticle.status == ArticleStatus.queued
    ).order_by(BatchArticle.row_index).first()


def update_article_status(
    db: Session,
    article_id: int,
    status: ArticleStatus,
    error_message: Optional[str] = None,
    generated_content: Optional[Dict[str, Any]] = None
) -> BatchArticle:
    """Update article processing status."""
    
    article = db.query(BatchArticle).filter(BatchArticle.id == article_id).first()
    if not article:
        raise ValueError(f"Article {article_id} not found")
    
    article.status = status
    
    if status == ArticleStatus.processing:
        article.started_at = datetime.utcnow()
        article.processing_attempts += 1
    
    elif status == ArticleStatus.completed:
        article.completed_at = datetime.utcnow()
        if article.started_at:
            duration = (article.completed_at - article.started_at).total_seconds()
            article.processing_duration_seconds = duration
        
        if generated_content:
            article.generated_title = generated_content.get("title")
            article.generated_content = generated_content.get("content")
            article.generated_meta_description = generated_content.get("meta_description")
            article.word_count_actual = generated_content.get("word_count")
    
    elif status == ArticleStatus.failed:
        article.completed_at = datetime.utcnow()
        article.error_message = error_message
    
    # Update batch counters
    batch = article.batch
    if status == ArticleStatus.completed:
        batch.completed_articles += 1
    elif status == ArticleStatus.failed:
        batch.failed_articles += 1
    
    # Check if batch is complete
    if batch.completed_articles + batch.failed_articles >= batch.total_articles:
        batch.status = BatchStatus.completed
        batch.completed_at = datetime.utcnow()
    
    # Log the status change
    log_entry = ProcessingLog(
        batch_id=batch.id,
        article_id=article.id,
        level="INFO" if status != ArticleStatus.failed else "ERROR",
        message=f"Article status changed to {status.value}",
        details={"error": error_message} if error_message else {}
    )
    db.add(log_entry)
    
    db.commit()
    db.refresh(article)
    
    return article


def update_batch_status(
    db: Session,
    batch_id: int,
    status: BatchStatus,
    error_message: Optional[str] = None
) -> ArticleBatch:
    """Update batch processing status."""
    
    batch = db.query(ArticleBatch).filter(ArticleBatch.id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")
    
    batch.status = status
    
    if status == BatchStatus.processing:
        batch.started_at = datetime.utcnow()
    elif status in [BatchStatus.completed, BatchStatus.failed, BatchStatus.cancelled]:
        batch.completed_at = datetime.utcnow()
    
    # Log the status change
    log_entry = ProcessingLog(
        batch_id=batch.id,
        level="INFO" if status != BatchStatus.failed else "ERROR",
        message=f"Batch status changed to {status.value}",
        details={"error": error_message} if error_message else {}
    )
    db.add(log_entry)
    
    db.commit()
    db.refresh(batch)
    
    return batch


def cancel_batch(db: Session, batch_id: str, user_id: str) -> ArticleBatch:
    """Cancel a batch and all its pending articles."""
    
    batch = get_batch(db, batch_id)
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")
    
    if batch.user_id != user_id:
        raise ValueError("Unauthorized")
    
    if batch.is_complete:
        raise ValueError("Cannot cancel completed batch")
    
    # Cancel all queued articles
    db.query(BatchArticle).filter(
        BatchArticle.batch_id == batch.id,
        BatchArticle.status == ArticleStatus.queued
    ).update({"status": ArticleStatus.skipped})
    
    # Update batch status
    batch.status = BatchStatus.cancelled
    batch.completed_at = datetime.utcnow()
    
    # Log cancellation
    log_entry = ProcessingLog(
        batch_id=batch.id,
        level="WARNING",
        message="Batch cancelled by user",
        details={"user_id": user_id}
    )
    db.add(log_entry)
    
    db.commit()
    db.refresh(batch)
    
    return batch


def get_batch_logs(
    db: Session,
    batch_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[ProcessingLog]:
    """Get processing logs for a batch."""
    return db.query(ProcessingLog).filter(
        ProcessingLog.batch_id == batch_id
    ).order_by(ProcessingLog.timestamp.desc()).offset(skip).limit(limit).all()