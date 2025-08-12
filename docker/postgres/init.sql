-- PostgreSQL initialization script
-- This runs when the database container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Create application schema
CREATE SCHEMA IF NOT EXISTS app;

-- Set default search path
ALTER DATABASE recipe_planner SET search_path TO app, public;

-- Performance tuning for container environment
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '512MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Create indexes for better performance
-- These will be created after Prisma migrations run
-- Just documenting the important ones here:

-- Users table
-- CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Recipes table  
-- CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes USING gin(name gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_recipes_created ON recipes(created_at DESC);

-- Pantry items
-- CREATE INDEX IF NOT EXISTS idx_pantry_user_exp ON pantry_items(user_id, expiration_date);
-- CREATE INDEX IF NOT EXISTS idx_pantry_location ON pantry_items(location_id);

-- AI tables
-- CREATE INDEX IF NOT EXISTS idx_ai_analytics_user_time ON ai_usage_analytics(user_id, timestamp DESC);
-- CREATE INDEX IF NOT EXISTS idx_ai_conversations_active ON ai_conversations(user_id, is_active);

-- Grant permissions to app user
GRANT ALL PRIVILEGES ON SCHEMA app TO recipe_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO recipe_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO recipe_user;

-- Reload configuration
SELECT pg_reload_conf();