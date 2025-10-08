-- Create database tables for bulk article processing

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE batch_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE article_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create article_batches table
CREATE TABLE IF NOT EXISTS article_batches (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    uploaded_filename VARCHAR(255),
    status batch_status DEFAULT 'pending' NOT NULL,
    total_articles INTEGER DEFAULT 0,
    completed_articles INTEGER DEFAULT 0,
    failed_articles INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    default_config JSON
);

-- Create indexes on article_batches
CREATE INDEX IF NOT EXISTS idx_article_batches_batch_id ON article_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_article_batches_user_id ON article_batches(user_id);

-- Create batch_articles table
CREATE TABLE IF NOT EXISTS batch_articles (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES article_batches(id) NOT NULL,
    topic TEXT NOT NULL,
    keywords TEXT,
    tone VARCHAR(50) DEFAULT 'professional',
    word_count INTEGER DEFAULT 1000,
    custom_persona TEXT,
    link_count INTEGER DEFAULT 5,
    use_inline_links INTEGER DEFAULT 1,
    use_apa_style INTEGER DEFAULT 0,
    status article_status DEFAULT 'queued' NOT NULL,
    processing_attempts INTEGER DEFAULT 0,
    error_message TEXT,
    generated_title TEXT,
    generated_content TEXT,
    generated_meta_description TEXT,
    word_count_actual INTEGER,
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    processing_duration_seconds FLOAT,
    row_index INTEGER,
    custom_metadata JSON
);

-- Create index on batch_articles
CREATE INDEX IF NOT EXISTS idx_batch_articles_batch_id ON batch_articles(batch_id);

-- Create processing_logs table
CREATE TABLE IF NOT EXISTS processing_logs (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES article_batches(id) NOT NULL,
    article_id INTEGER REFERENCES batch_articles(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    level VARCHAR(20),
    message TEXT,
    details JSON
);

-- Create index on processing_logs
CREATE INDEX IF NOT EXISTS idx_processing_logs_batch_id ON processing_logs(batch_id);

-- Create destination_hero_images table
CREATE TABLE IF NOT EXISTS destination_hero_images (
    id SERIAL PRIMARY KEY,
    destination_slug VARCHAR(128) UNIQUE NOT NULL,
    destination_name VARCHAR(128) NOT NULL,
    prompt TEXT NOT NULL,
    prompt_version VARCHAR(32) DEFAULT 'poc-v1' NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    image_webp BYTEA NOT NULL,
    image_jpeg BYTEA,
    image_webp_size INTEGER NOT NULL,
    image_jpeg_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    extra_metadata JSON
);

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('article_batches', 'batch_articles', 'processing_logs');
