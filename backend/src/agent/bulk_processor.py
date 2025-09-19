"""Bulk article processor service."""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from langgraph_sdk import get_client
from sqlalchemy.orm import Session

from .database import SessionLocal
from .database.models import BatchStatus, ArticleStatus
from .database.operations import (
    get_next_queued_article,
    update_article_status,
    update_batch_status,
    get_batch
)

logger = logging.getLogger(__name__)


class BulkArticleProcessor:
    """Process articles in bulk using the existing LangGraph agent."""
    
    def __init__(self, langgraph_url: str = "http://localhost:2024"):
        """Initialize the bulk processor.
        
        Args:
            langgraph_url: URL of the LangGraph API server
        """
        self.langgraph_url = langgraph_url
        self.client = None
        self.processing = False
        self.current_batch_id = None
    
    async def start(self):
        """Start the processor and connect to LangGraph."""
        import os
        # Only use SDK client in local development
        if not os.getenv("RAILWAY_ENVIRONMENT"):
            self.client = get_client(url=self.langgraph_url)
        self.processing = True
        logger.info(f"Bulk processor started, mode: {'production' if os.getenv('RAILWAY_ENVIRONMENT') else 'local'}")
    
    async def stop(self):
        """Stop the processor."""
        self.processing = False
        if self.client:
            await self.client.close()
        logger.info("Bulk processor stopped")
    
    async def process_article(self, article_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single article using the LangGraph agent.

        Args:
            article_data: Article parameters (topic, keywords, tone, etc.)

        Returns:
            Generated article content
        """
        try:
            # In production, use the local graph directly instead of SDK
            import os

            # Check if we're in production (Railway or if client is None)
            is_production = os.getenv("RAILWAY_ENVIRONMENT") or self.client is None

            logger.info(f"Environment check - RAILWAY_ENVIRONMENT: {os.getenv('RAILWAY_ENVIRONMENT')}, client: {self.client is not None}, is_production: {is_production}")

            if is_production:
                # Use the local graph directly in production
                logger.info(f"Processing article in PRODUCTION mode: {article_data['topic']}")
                from langchain_core.runnables import RunnableConfig
                from agent.graph import graph
                from datetime import datetime

                # Use same input format as the frontend
                agent_input = {
                    "messages": [
                        {
                            "type": "human",
                            "content": article_data["topic"],
                            "id": str(int(datetime.now().timestamp() * 1000))
                        }
                    ],
                    "article_tone": article_data.get("tone", "professional"),
                    "word_count": article_data.get("word_count", 1000),
                    "keywords": article_data.get("keywords", ""),
                    "custom_persona": article_data.get("custom_persona", ""),
                    "link_count": article_data.get("link_count", 5),
                    "use_inline_links": article_data.get("use_inline_links", True),
                    "use_apa_style": article_data.get("use_apa_style", False),
                    "initial_search_query_count": 2,  # Medium effort
                    "max_research_loops": 2
                }

                config = RunnableConfig()
                result = await graph.ainvoke(agent_input, config=config)

                # Log the result structure for debugging
                logger.info(f"Graph result keys: {result.keys() if result else 'None'}")

                # Extract content from messages (graph returns AIMessage objects)
                final_content = ""
                if result and "messages" in result and result["messages"]:
                    # Get the last message content
                    last_message = result["messages"][-1]
                    if hasattr(last_message, 'content'):
                        final_content = last_message.content
                    else:
                        final_content = str(last_message)
                    logger.info(f"Extracted content from message type: {type(last_message).__name__}")
                else:
                    logger.error(f"No messages in result. Result: {result}")

                logger.info(f"Article processed in production: {article_data['topic']}, content length: {len(final_content)}")
            else:
                # Use LangGraph SDK for local development
                if not self.client:
                    raise ValueError("LangGraph client not initialized for local mode")

                logger.info(f"Processing article in LOCAL mode: {article_data['topic']}")
                from datetime import datetime

                # Use same input format as production
                agent_input = {
                    "messages": [
                        {
                            "type": "human",
                            "content": article_data["topic"],
                            "id": str(int(datetime.now().timestamp() * 1000))
                        }
                    ],
                    "article_tone": article_data.get("tone", "professional"),
                    "word_count": article_data.get("word_count", 1000),
                    "keywords": article_data.get("keywords", ""),
                    "custom_persona": article_data.get("custom_persona", ""),
                    "link_count": article_data.get("link_count", 5),
                    "use_inline_links": article_data.get("use_inline_links", True),
                    "use_apa_style": article_data.get("use_apa_style", False),
                    "initial_search_query_count": 2,  # Medium effort
                    "max_research_loops": 2
                }

                # Create a thread and run the agent
                assistants = await self.client.assistants.search(graph_id="agent")
                assistant = assistants[0]
                thread = await self.client.threads.create()

                # Stream the agent execution
                final_content = None
                async for chunk in self.client.runs.stream(
                    thread["thread_id"],
                    assistant["assistant_id"],
                    input=agent_input,
                    stream_mode="updates"
                ):
                    # Capture the final content from messages
                    if chunk.data:
                        # Check for messages in the chunk data
                        if isinstance(chunk.data, dict) and "messages" in chunk.data:
                            messages = chunk.data["messages"]
                            if messages and len(messages) > 0:
                                last_msg = messages[-1]
                                if hasattr(last_msg, 'content'):
                                    final_content = last_msg.content
                                elif isinstance(last_msg, dict) and "content" in last_msg:
                                    final_content = last_msg["content"]
            
            if not final_content:
                raise ValueError("No content generated")
            
            # Parse the generated content to extract title and body
            lines = final_content.strip().split('\n')
            title = ""
            content = final_content
            
            # Extract title if it starts with #
            if lines and lines[0].startswith('#'):
                title = lines[0].replace('#', '').strip()
                content = '\n'.join(lines[1:]).strip()
            
            # Count actual words
            word_count = len(content.split())
            
            return {
                "title": title,
                "content": content,
                "meta_description": f"{title[:150]}..." if title else "",
                "word_count": word_count,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error processing article: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_batch(self, batch_id: str):
        """Process all articles in a batch.
        
        Args:
            batch_id: Batch identifier
        """
        db = SessionLocal()
        try:
            # Get the batch
            batch = get_batch(db, batch_id)
            if not batch:
                logger.error(f"Batch {batch_id} not found")
                return
            
            # Update batch status to processing
            batch = update_batch_status(db, batch.id, BatchStatus.processing)
            logger.info(f"Starting batch {batch_id} with {batch.total_articles} articles")
            
            self.current_batch_id = batch.id
            
            # Process articles one by one
            while self.processing:
                # Get next queued article
                article = get_next_queued_article(db, batch.id)
                if not article:
                    # No more articles to process
                    break
                
                logger.info(f"Processing article {article.id}: {article.topic}")
                
                # Update article status to processing
                article = update_article_status(
                    db, article.id, ArticleStatus.processing
                )
                
                # Process the article
                start_time = datetime.utcnow()
                result = await self.process_article({
                    "topic": article.topic,
                    "keywords": article.keywords,
                    "tone": article.tone,
                    "word_count": article.word_count,
                    "custom_persona": article.custom_persona,
                    "link_count": article.link_count,
                    "use_inline_links": bool(article.use_inline_links),
                    "use_apa_style": bool(article.use_apa_style)
                })
                
                # Update article with results
                if result["success"]:
                    article = update_article_status(
                        db,
                        article.id,
                        ArticleStatus.completed,
                        generated_content=result
                    )
                    logger.info(f"Article {article.id} completed successfully")
                else:
                    article = update_article_status(
                        db,
                        article.id,
                        ArticleStatus.failed,
                        error_message=result.get("error", "Unknown error")
                    )
                    logger.error(f"Article {article.id} failed: {result.get('error')}")
                
                # Small delay between articles to avoid overwhelming the API
                await asyncio.sleep(2)
            
            # Check if all articles are processed
            db.refresh(batch)
            if batch.completed_articles + batch.failed_articles >= batch.total_articles:
                # Batch is complete
                final_status = BatchStatus.completed if batch.failed_articles == 0 else BatchStatus.completed
                batch = update_batch_status(db, batch.id, final_status)
                logger.info(
                    f"Batch {batch_id} completed: "
                    f"{batch.completed_articles} successful, "
                    f"{batch.failed_articles} failed"
                )
            
        except Exception as e:
            logger.error(f"Error processing batch {batch_id}: {str(e)}")
            if batch:
                update_batch_status(
                    db, batch.id, BatchStatus.failed, error_message=str(e)
                )
        finally:
            db.close()
            self.current_batch_id = None
    
    async def process_queue(self):
        """Process batches from the queue continuously."""
        while self.processing:
            db = SessionLocal()
            try:
                # Find the next pending batch
                from sqlalchemy import and_
                from .database.models import ArticleBatch
                
                batch = db.query(ArticleBatch).filter(
                    ArticleBatch.status == BatchStatus.pending
                ).order_by(ArticleBatch.created_at).first()
                
                if batch:
                    logger.info(f"Found pending batch: {batch.batch_id}")
                    await self.process_batch(batch.batch_id)
                else:
                    # No batches to process, wait
                    await asyncio.sleep(10)
                    
            except Exception as e:
                logger.error(f"Error in queue processor: {str(e)}")
                await asyncio.sleep(10)
            finally:
                db.close()


async def run_bulk_processor():
    """Run the bulk processor as a standalone service."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    processor = BulkArticleProcessor()
    
    try:
        await processor.start()
        logger.info("Bulk processor service started")
        await processor.process_queue()
    except KeyboardInterrupt:
        logger.info("Shutting down bulk processor...")
    finally:
        await processor.stop()


if __name__ == "__main__":
    # Run the processor
    asyncio.run(run_bulk_processor())