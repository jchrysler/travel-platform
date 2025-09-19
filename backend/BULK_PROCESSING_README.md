# Bulk Article Processing System

## Overview

The Bulk Article Processing System allows you to generate multiple articles at once by uploading a CSV or Excel file with article parameters. The system processes articles asynchronously using the same generation logic as the single article generator.

## Features

- **Batch Upload**: Upload CSV/Excel files with up to 100 articles per batch
- **Progress Tracking**: Real-time monitoring of batch processing status
- **Download Results**: Export completed articles in CSV, Excel, or JSON format
- **Template Download**: Get pre-formatted templates for easy batch creation
- **Cancellation**: Cancel in-progress batches
- **Detailed Logs**: View processing logs for debugging

## Architecture

### Components

1. **Database** (`src/agent/database/`)
   - SQLAlchemy models for batches and articles
   - SQLite for development, PostgreSQL ready for production
   - Tracks processing status, timing, and results

2. **Bulk Processor** (`src/agent/bulk_processor.py`)
   - Async service that processes articles from the queue
   - Uses the exact same LangGraph agent as single articles
   - Handles errors gracefully with retry logic

3. **API Endpoints** (`src/agent/bulk_api.py`)
   - RESTful API for batch management
   - File upload, status checking, and download endpoints

4. **Frontend UI** (`frontend/src/pages/BulkGenerator.tsx`)
   - React component with drag-and-drop file upload
   - Real-time progress monitoring
   - Batch management interface

## API Endpoints

### Upload Batch
```
POST /api/bulk/upload
```
Upload a CSV or Excel file with article parameters.

**CSV Format:**
- `topic` (required): Article topic
- `keywords`: Comma-separated keywords
- `tone`: professional/casual/academic/expert
- `word_count`: Target word count (default: 1000)
- `custom_persona`: Custom writing persona
- `link_count`: Number of links to include (default: 5)
- `use_inline_links`: true/false (default: true)
- `use_apa_style`: true/false (default: false)

### List Batches
```
GET /api/bulk/batches
```
Get list of all batches for the current user.

### Get Batch Status
```
GET /api/bulk/batch/{batch_id}
```
Get detailed status and article information for a specific batch.

### Download Results
```
GET /api/bulk/batch/{batch_id}/download?format=csv
```
Download completed articles. Supports formats: csv, xlsx, json

### Cancel Batch
```
POST /api/bulk/batch/{batch_id}/cancel
```
Cancel a pending or processing batch.

### Download Template
```
GET /api/bulk/template?format=csv
```
Download a template file for creating batches.

## Usage

### Via Web Interface

1. Navigate to `/bulk` in the application
2. Download a template CSV/Excel file
3. Fill in your article parameters
4. Upload the file via drag-and-drop or file selector
5. Monitor progress in real-time
6. Download completed articles when ready

### Via API

See `test_bulk_upload.py` for a complete example:

```python
import requests
import pandas as pd

# Create article data
data = [{
    "topic": "The Future of AI",
    "keywords": "artificial intelligence, machine learning",
    "tone": "professional",
    "word_count": 1000
}]

df = pd.DataFrame(data)
csv_buffer = df.to_csv(index=False).encode()

# Upload batch
files = {'file': ('batch.csv', csv_buffer, 'text/csv')}
response = requests.post(
    "http://localhost:2024/api/bulk/upload",
    files=files
)

batch_id = response.json()['batch_id']

# Check status
status = requests.get(
    f"http://localhost:2024/api/bulk/batch/{batch_id}"
).json()

# Download results when complete
if status['status'] == 'completed':
    results = requests.get(
        f"http://localhost:2024/api/bulk/batch/{batch_id}/download?format=csv"
    )
```

## Running the Bulk Processor

The bulk processor can run as a standalone service:

```bash
cd backend
python -m agent.bulk_processor
```

Or it can be integrated into your existing workflow.

## Database Setup

Initialize the database:

```bash
cd backend/src/agent/database
python init_db.py
```

This creates the necessary tables for batch processing.

## Configuration

### Environment Variables

- `DATABASE_URL`: Database connection string (defaults to SQLite)
- `GEMINI_API_KEY`: Required for article generation
- `LANGSMITH_API_KEY`: Required for production

### Processing Settings

- Maximum articles per batch: 100
- Processing delay between articles: 2 seconds
- Queue check interval: 10 seconds

## Testing

Use the provided test script:

```bash
python test_bulk_upload.py
```

This will:
1. Create a test CSV with 3 articles
2. Upload the batch
3. Monitor progress
4. Download results when complete

## Production Considerations

1. **Database**: Switch to PostgreSQL for production
2. **Queue Processing**: Consider using Celery or similar for robust queue management
3. **Rate Limiting**: Implement rate limits for API endpoints
4. **Authentication**: Add proper user authentication
5. **Storage**: Consider cloud storage for large result files
6. **Monitoring**: Add proper logging and monitoring

## Troubleshooting

### Common Issues

1. **Upload fails with "No topic column"**
   - Ensure your CSV has a column named "topic" (case-sensitive)

2. **Articles stuck in "queued" status**
   - Check if the bulk processor is running
   - Verify GEMINI_API_KEY is set

3. **Download returns empty file**
   - Wait for batch processing to complete
   - Check if articles failed (view batch details)

4. **Batch cancelled automatically**
   - Check processing logs for errors
   - Verify API keys are valid

## Future Enhancements

- Email notifications when batches complete
- Scheduled batch processing
- Priority queues for urgent batches
- Batch templates and presets
- Advanced filtering and search
- Cost estimation before processing
- Webhook notifications
- Batch comparison and analytics