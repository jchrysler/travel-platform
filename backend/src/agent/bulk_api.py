"""API endpoints for bulk article processing."""

import io
import json
import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd

from .database import get_db
from .database.models import BatchStatus, ArticleStatus
from .database.operations import (
    create_batch,
    get_batch,
    get_user_batches,
    cancel_batch,
    get_batch_logs
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bulk", tags=["bulk"])


@router.post("/upload")
async def upload_batch(
    file: UploadFile = File(...),
    name: Optional[str] = None,
    description: Optional[str] = None,
    user_id: str = "default_user",  # In production, get from auth
    db: Session = Depends(get_db)
):
    """Upload a CSV or Excel file with article parameters.
    
    CSV format:
    - topic (required): Article topic
    - keywords: Comma-separated keywords
    - tone: professional/casual/academic/expert
    - word_count: Target word count
    - custom_persona: Custom writing persona
    - link_count: Number of links to include
    - use_inline_links: true/false
    - use_apa_style: true/false
    """
    try:
        # Validate file type
        if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
            raise HTTPException(
                status_code=400,
                detail="File must be CSV or Excel format"
            )
        
        # Read file content
        content = await file.read()
        
        # Parse file based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Validate required columns
        if 'topic' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="CSV must have 'topic' column"
            )
        
        # Remove empty rows
        df = df[df['topic'].notna() & (df['topic'] != '')]
        
        if len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="No valid articles found in file"
            )
        
        if len(df) > 100:
            raise HTTPException(
                status_code=400,
                detail="Maximum 100 articles per batch"
            )
        
        # Convert DataFrame to list of dicts
        articles_data = []
        for _, row in df.iterrows():
            article = {
                "topic": str(row.get('topic', '')),
                "keywords": str(row.get('keywords', '')),
                "tone": str(row.get('tone', 'professional')),
                "word_count": int(row.get('word_count', 1000)),
                "custom_persona": str(row.get('custom_persona', '')),
                "link_count": int(row.get('link_count', 5)),
                "use_inline_links": bool(row.get('use_inline_links', True)),
                "use_apa_style": bool(row.get('use_apa_style', False))
            }
            
            # Store any extra columns as metadata
            extra_cols = set(row.index) - {'topic', 'keywords', 'tone', 'word_count', 
                                          'custom_persona', 'link_count', 
                                          'use_inline_links', 'use_apa_style'}
            if extra_cols:
                article['custom_metadata'] = {col: row[col] for col in extra_cols}
            
            articles_data.append(article)
        
        # Create batch in database
        batch = create_batch(
            db,
            user_id=user_id,
            name=name or file.filename,
            articles_data=articles_data,
            description=description,
            uploaded_filename=file.filename
        )
        
        return {
            "batch_id": batch.batch_id,
            "status": batch.status.value,
            "total_articles": batch.total_articles,
            "message": f"Batch created with {batch.total_articles} articles"
        }
        
    except pd.errors.ParserError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error parsing file: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error uploading batch: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing batch: {str(e)}"
        )


@router.get("/batches")
def get_batches(
    user_id: str = "default_user",
    status: Optional[BatchStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get list of batches for a user."""
    batches = get_user_batches(db, user_id, skip, limit, status)
    
    return {
        "batches": [
            {
                "batch_id": b.batch_id,
                "name": b.name,
                "status": b.status.value,
                "total_articles": b.total_articles,
                "completed_articles": b.completed_articles,
                "failed_articles": b.failed_articles,
                "progress_percentage": b.progress_percentage,
                "created_at": b.created_at.isoformat(),
                "completed_at": b.completed_at.isoformat() if b.completed_at else None
            }
            for b in batches
        ]
    }


@router.get("/batch/{batch_id}")
def get_batch_status(
    batch_id: str,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Get detailed status of a batch."""
    batch = get_batch(db, batch_id)
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Get article details
    articles = []
    for article in batch.articles:
        articles.append({
            "id": article.id,
            "topic": article.topic,
            "status": article.status.value,
            "error_message": article.error_message,
            "word_count_actual": article.word_count_actual,
            "processing_time_minutes": article.processing_time_minutes
        })
    
    return {
        "batch_id": batch.batch_id,
        "name": batch.name,
        "description": batch.description,
        "status": batch.status.value,
        "total_articles": batch.total_articles,
        "completed_articles": batch.completed_articles,
        "failed_articles": batch.failed_articles,
        "progress_percentage": batch.progress_percentage,
        "created_at": batch.created_at.isoformat(),
        "started_at": batch.started_at.isoformat() if batch.started_at else None,
        "completed_at": batch.completed_at.isoformat() if batch.completed_at else None,
        "articles": articles
    }


@router.get("/batch/{batch_id}/download")
def download_batch(
    batch_id: str,
    format: str = Query("csv", regex="^(csv|xlsx|json)$"),
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Download completed articles from a batch."""
    batch = get_batch(db, batch_id)
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Prepare data for export
    data = []
    for article in batch.articles:
        if article.status == ArticleStatus.COMPLETED:
            data.append({
                "topic": article.topic,
                "keywords": article.keywords,
                "tone": article.tone,
                "title": article.generated_title,
                "content": article.generated_content,
                "word_count": article.word_count_actual,
                "status": "completed"
            })
        elif article.status == ArticleStatus.FAILED:
            data.append({
                "topic": article.topic,
                "keywords": article.keywords,
                "tone": article.tone,
                "title": "",
                "content": f"Error: {article.error_message}",
                "word_count": 0,
                "status": "failed"
            })
    
    if not data:
        raise HTTPException(
            status_code=400,
            detail="No completed articles to download"
        )
    
    # Convert to requested format
    if format == "json":
        content = json.dumps(data, indent=2)
        media_type = "application/json"
        filename = f"{batch_id}.json"
    else:
        df = pd.DataFrame(data)
        
        if format == "csv":
            output = io.StringIO()
            df.to_csv(output, index=False)
            content = output.getvalue()
            media_type = "text/csv"
            filename = f"{batch_id}.csv"
        else:  # xlsx
            output = io.BytesIO()
            df.to_excel(output, index=False, engine='openpyxl')
            content = output.getvalue()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"{batch_id}.xlsx"
    
    # Return as downloadable file
    if isinstance(content, str):
        content = content.encode('utf-8')
    
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.post("/batch/{batch_id}/cancel")
def cancel_batch_endpoint(
    batch_id: str,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Cancel a batch and stop processing."""
    try:
        batch = cancel_batch(db, batch_id, user_id)
        return {
            "batch_id": batch.batch_id,
            "status": batch.status.value,
            "message": "Batch cancelled successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/batch/{batch_id}/logs")
def get_batch_logs_endpoint(
    batch_id: str,
    user_id: str = "default_user",
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get processing logs for a batch."""
    batch = get_batch(db, batch_id)
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    logs = get_batch_logs(db, batch.id, skip, limit)
    
    return {
        "logs": [
            {
                "timestamp": log.timestamp.isoformat(),
                "level": log.level,
                "message": log.message,
                "details": log.details
            }
            for log in logs
        ]
    }


@router.get("/template")
def download_template(format: str = Query("csv", regex="^(csv|xlsx)$")):
    """Download a template file for batch upload."""
    
    # Create sample data
    template_data = [
        {
            "topic": "The Future of Electric Vehicles in Urban Transportation",
            "keywords": "electric vehicles, urban mobility, sustainable transport",
            "tone": "professional",
            "word_count": 1000,
            "custom_persona": "",
            "link_count": 5,
            "use_inline_links": "true",
            "use_apa_style": "false"
        },
        {
            "topic": "How AI is Transforming Healthcare Diagnostics",
            "keywords": "artificial intelligence, healthcare, medical diagnostics",
            "tone": "expert",
            "word_count": 1200,
            "custom_persona": "Write as a medical technology expert",
            "link_count": 7,
            "use_inline_links": "true",
            "use_apa_style": "true"
        },
        {
            "topic": "Remote Work Best Practices for Team Productivity",
            "keywords": "remote work, productivity, team management",
            "tone": "casual",
            "word_count": 800,
            "custom_persona": "",
            "link_count": 4,
            "use_inline_links": "true",
            "use_apa_style": "false"
        }
    ]
    
    df = pd.DataFrame(template_data)
    
    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        content = output.getvalue().encode('utf-8')
        media_type = "text/csv"
        filename = "article_batch_template.csv"
    else:  # xlsx
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        content = output.getvalue()
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "article_batch_template.xlsx"
    
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )