"""API endpoints for bulk article processing."""

import io
import json
import logging
import uuid
import zipfile
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
    format: str = Query("csv", regex="^(csv|xlsx|json|markdown|html)$"),
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Download completed articles from a batch in various formats.

    Formats:
    - csv: Spreadsheet with article data
    - xlsx: Excel spreadsheet
    - json: JSON data
    - markdown: ZIP file with individual .md files
    - html: ZIP file with individual .html files
    """
    batch = get_batch(db, batch_id)

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Prepare data for export
    data = []
    articles_for_zip = []

    for article in batch.articles:
        if article.status == ArticleStatus.completed:
            article_data = {
                "topic": article.topic,
                "keywords": article.keywords,
                "tone": article.tone,
                "title": article.generated_title,
                "content": article.generated_content,
                "word_count": article.word_count_actual,
                "status": "completed"
            }
            data.append(article_data)
            articles_for_zip.append(article_data)
        elif article.status == ArticleStatus.failed:
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
    if format == "markdown":
        # Create ZIP with markdown files
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for i, article in enumerate(articles_for_zip):
                # Create filename from title or topic
                safe_title = (article['title'] or article['topic']).replace('/', '-')[:50]
                filename = f"{i+1:03d}_{safe_title}.md"

                # Build markdown content with metadata
                md_content = f"# {article['title']}\n\n"
                md_content += f"**Topic**: {article['topic']}\n"
                md_content += f"**Keywords**: {article['keywords']}\n"
                md_content += f"**Tone**: {article['tone']}\n"
                md_content += f"**Word Count**: {article['word_count']}\n\n"
                md_content += "---\n\n"
                md_content += article['content']

                zip_file.writestr(filename, md_content)

            # Add metadata file
            metadata = {
                "batch_id": batch.batch_id,
                "batch_name": batch.name,
                "created_at": batch.created_at.isoformat(),
                "total_articles": len(articles_for_zip),
                "articles": [{"title": a['title'], "topic": a['topic'], "word_count": a['word_count']}
                            for a in articles_for_zip]
            }
            zip_file.writestr("metadata.json", json.dumps(metadata, indent=2))

        content = zip_buffer.getvalue()
        media_type = "application/zip"
        filename = f"{batch_id}_markdown.zip"

    elif format == "html":
        # Create ZIP with HTML files
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for i, article in enumerate(articles_for_zip):
                # Create filename from title or topic
                safe_title = (article['title'] or article['topic']).replace('/', '-')[:50]
                filename = f"{i+1:03d}_{safe_title}.html"

                # Convert markdown to HTML (basic conversion)
                html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{article['title']}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }}
        h1, h2, h3 {{ color: #333; margin-top: 1.5em; }}
        .metadata {{ background: #f5f5f5; padding: 1rem; border-radius: 5px; margin-bottom: 2rem; }}
        .metadata p {{ margin: 0.5rem 0; }}
        a {{ color: #0066cc; }}
        pre {{ background: #f4f4f4; padding: 1rem; overflow-x: auto; }}
        code {{ background: #f4f4f4; padding: 0.2rem 0.4rem; }}
    </style>
</head>
<body>
    <h1>{article['title']}</h1>
    <div class="metadata">
        <p><strong>Topic</strong>: {article['topic']}</p>
        <p><strong>Keywords</strong>: {article['keywords']}</p>
        <p><strong>Tone</strong>: {article['tone']}</p>
        <p><strong>Word Count</strong>: {article['word_count']}</p>
    </div>
    <div class="content">
"""
                # Basic markdown to HTML conversion
                content_html = article['content']
                # Convert headers
                for level in range(6, 0, -1):
                    content_html = content_html.replace(f"\n{'#' * level} ", f"\n<h{level}>").replace(f"\n<h{level}>", f"</h{level}>\n<h{level}>")
                # Convert bold and italic
                content_html = content_html.replace("**", "<strong>").replace("</strong>", "").replace("<strong>", "<strong>", 1).replace("<strong>", "</strong>", 1)
                # Convert line breaks to paragraphs
                paragraphs = content_html.split("\n\n")
                content_html = "".join([f"<p>{p}</p>" if not p.startswith("<h") else p for p in paragraphs])

                html_content += content_html
                html_content += """
    </div>
</body>
</html>"""

                zip_file.writestr(filename, html_content)

            # Add index file
            index_html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Article Batch</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1 { color: #333; }
        ul { line-height: 1.8; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Article Batch</h1>
    <ul>
"""
            for i, article in enumerate(articles_for_zip):
                safe_title = (article['title'] or article['topic']).replace('/', '-')[:50]
                filename = f"{i+1:03d}_{safe_title}.html"
                index_html += f'        <li><a href="{filename}">{article["title"]}</a> ({article["word_count"]} words)</li>\n'

            index_html += """    </ul>
</body>
</html>"""
            zip_file.writestr("index.html", index_html)

        content = zip_buffer.getvalue()
        media_type = "application/zip"
        filename = f"{batch_id}_html.zip"

    elif format == "json":
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


@router.get("/batch/{batch_id}/article/{article_id}")
def get_article(
    batch_id: str,
    article_id: int,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Get a single article from a batch."""
    batch = get_batch(db, batch_id)

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Find the article
    article = None
    for a in batch.articles:
        if a.id == article_id:
            article = a
            break

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if article.status != ArticleStatus.completed:
        raise HTTPException(status_code=400, detail=f"Article is {article.status.value}, not completed")

    return {
        "id": article.id,
        "topic": article.topic,
        "keywords": article.keywords,
        "tone": article.tone,
        "title": article.generated_title,
        "content": article.generated_content,
        "word_count": article.word_count_actual,
        "status": article.status.value,
        "completed_at": article.completed_at.isoformat() if article.completed_at else None
    }


@router.get("/batch/{batch_id}/status/stream")
async def stream_batch_status(
    batch_id: str,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Stream batch processing status updates via Server-Sent Events."""
    from fastapi import Response
    from fastapi.responses import StreamingResponse
    import asyncio
    import json

    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    async def generate():
        """Generate SSE events for batch status updates."""
        last_status = None
        last_completed = 0
        last_failed = 0

        while True:
            # Refresh batch data
            db.expire_all()
            batch = get_batch(db, batch_id)

            if not batch:
                yield f"data: {json.dumps({'error': 'Batch not found'})}\n\n"
                break

            # Check for changes
            if (batch.status != last_status or
                batch.completed_articles != last_completed or
                batch.failed_articles != last_failed):

                # Send status update
                status_data = {
                    "batch_id": batch.batch_id,
                    "status": batch.status.value,
                    "total_articles": batch.total_articles,
                    "completed_articles": batch.completed_articles,
                    "failed_articles": batch.failed_articles,
                    "progress_percentage": batch.progress_percentage,
                    "is_complete": batch.is_complete
                }

                # Include current article being processed
                current_article = None
                for article in batch.articles:
                    if article.status == ArticleStatus.processing:
                        current_article = {
                            "id": article.id,
                            "topic": article.topic,
                            "status": "processing"
                        }
                        break

                if current_article:
                    status_data["current_article"] = current_article

                yield f"data: {json.dumps(status_data)}\n\n"

                last_status = batch.status
                last_completed = batch.completed_articles
                last_failed = batch.failed_articles

            # Stop streaming if batch is complete
            if batch.is_complete:
                break

            # Wait before next check
            await asyncio.sleep(2)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable Nginx buffering
        }
    )


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