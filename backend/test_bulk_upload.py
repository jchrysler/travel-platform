#!/usr/bin/env python3
"""Test script for bulk article upload."""

import requests
import pandas as pd
import time
import json
from io import BytesIO

# Configuration
API_BASE_URL = "http://localhost:2024"  # Change to your backend URL

def create_test_csv():
    """Create a test CSV file with article data."""
    data = [
        {
            "topic": "The Benefits of Remote Work for Small Businesses",
            "keywords": "remote work, small business, productivity, cost savings",
            "tone": "professional",
            "word_count": 800,
            "link_count": 5,
            "use_inline_links": True,
            "use_apa_style": False
        },
        {
            "topic": "How AI is Revolutionizing Customer Service",
            "keywords": "artificial intelligence, customer service, chatbots, automation",
            "tone": "expert",
            "word_count": 1000,
            "link_count": 7,
            "use_inline_links": True,
            "use_apa_style": True
        },
        {
            "topic": "Top 10 Healthy Breakfast Ideas for Busy Mornings",
            "keywords": "healthy breakfast, quick meals, nutrition, morning routine",
            "tone": "casual",
            "word_count": 750,
            "link_count": 4,
            "use_inline_links": True,
            "use_apa_style": False
        }
    ]
    
    df = pd.DataFrame(data)
    return df

def upload_batch(csv_buffer):
    """Upload a batch to the API."""
    files = {
        'file': ('test_batch.csv', csv_buffer, 'text/csv')
    }
    data = {
        'name': 'Test Batch',
        'description': 'Testing bulk article generation'
    }
    
    response = requests.post(
        f"{API_BASE_URL}/api/bulk/upload",
        files=files,
        data=data
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Batch uploaded successfully!")
        print(f"   Batch ID: {result['batch_id']}")
        print(f"   Status: {result['status']}")
        print(f"   Total Articles: {result['total_articles']}")
        return result['batch_id']
    else:
        print(f"❌ Upload failed: {response.text}")
        return None

def check_batch_status(batch_id):
    """Check the status of a batch."""
    response = requests.get(f"{API_BASE_URL}/api/bulk/batch/{batch_id}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n📊 Batch Status:")
        print(f"   Status: {data['status']}")
        print(f"   Progress: {data['progress_percentage']:.1f}%")
        print(f"   Completed: {data['completed_articles']}/{data['total_articles']}")
        print(f"   Failed: {data['failed_articles']}")
        
        if data['articles']:
            print(f"\n   Article Details:")
            for article in data['articles']:
                status_emoji = "✅" if article['status'] == 'completed' else "⏳" if article['status'] in ['queued', 'processing'] else "❌"
                print(f"   {status_emoji} {article['topic'][:50]}... - {article['status']}")
        
        return data
    else:
        print(f"❌ Failed to get batch status: {response.text}")
        return None

def download_batch(batch_id, format='csv'):
    """Download completed articles from a batch."""
    response = requests.get(
        f"{API_BASE_URL}/api/bulk/batch/{batch_id}/download",
        params={'format': format}
    )
    
    if response.status_code == 200:
        filename = f"batch_{batch_id}_results.{format}"
        with open(filename, 'wb') as f:
            f.write(response.content)
        print(f"\n✅ Results downloaded to {filename}")
        return filename
    else:
        print(f"❌ Download failed: {response.text}")
        return None

def main():
    """Main test function."""
    print("🚀 Bulk Article Generator Test")
    print("=" * 40)
    
    # Create test data
    print("\n1. Creating test CSV...")
    df = create_test_csv()
    print(f"   Created CSV with {len(df)} articles")
    
    # Convert to CSV buffer
    csv_buffer = BytesIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    # Upload batch
    print("\n2. Uploading batch...")
    batch_id = upload_batch(csv_buffer)
    
    if not batch_id:
        print("Upload failed. Exiting.")
        return
    
    # Monitor progress
    print("\n3. Monitoring progress...")
    print("   (This will check status every 10 seconds)")
    
    max_checks = 30  # Max 5 minutes
    checks = 0
    
    while checks < max_checks:
        time.sleep(10)
        batch_data = check_batch_status(batch_id)
        
        if not batch_data:
            break
        
        if batch_data['status'] in ['completed', 'failed', 'cancelled']:
            print(f"\n✨ Batch processing complete!")
            break
        
        checks += 1
    
    # Download results if available
    if batch_data and batch_data['status'] == 'completed' and batch_data['completed_articles'] > 0:
        print("\n4. Downloading results...")
        download_batch(batch_id, 'csv')
        download_batch(batch_id, 'json')
    
    print("\n✅ Test complete!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")