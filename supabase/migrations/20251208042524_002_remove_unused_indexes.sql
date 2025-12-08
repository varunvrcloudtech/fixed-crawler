/*
  # Remove Unused Indexes

  1. Security Improvements
    - Remove unused index on user_id (queries are simple enough without it)
    - Remove unused index on created_at (low data volume doesn't require it)
    - Remove unused index on scrape_type (minimal filtering benefit)

  2. Notes
    - These indexes were creating unnecessary overhead
    - Can be re-added later if query patterns change and performance metrics show need
    - Table already has PRIMARY KEY index on id column
    - Foreign key on user_id provides sufficient lookup performance for current usage
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_scraped_data_user_id;
DROP INDEX IF EXISTS idx_scraped_data_created_at;
DROP INDEX IF EXISTS idx_scraped_data_scrape_type;
