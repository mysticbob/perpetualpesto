-- Initialize the database with required extensions and optimizations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For faster text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For better index performance

-- Performance optimizations
-- Increase shared_buffers for better caching (adjust based on available RAM)
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET random_page_cost = 1.1; -- For SSD storage
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Create a simple health check table
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for full-text search on recipe names and ingredients
-- These will be created by Prisma migrations, but we can prepare the database
-- for better text search performance

-- Insert initial health check
INSERT INTO health_check (created_at) VALUES (CURRENT_TIMESTAMP);