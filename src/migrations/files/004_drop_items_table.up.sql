-- Drop items table and related objects
-- This migration safely removes the items table that was created in migration 001

-- Drop index
DROP INDEX IF EXISTS idx_items_name;

-- Drop items table
DROP TABLE IF EXISTS items;

