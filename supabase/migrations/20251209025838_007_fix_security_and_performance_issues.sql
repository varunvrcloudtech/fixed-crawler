/*
  # Fix Security and Performance Issues

  1. Add Missing Foreign Key Indexes
    - Add index on `scraped_data.user_id` for better query performance
    - Add index on `real_estate_choices.scraped_data_id` for better query performance
    - These indexes improve join performance and foreign key constraint checks

  2. Optimize RLS Policies with SELECT Wrapper
    - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation of auth function for each row
    - Significantly improves query performance at scale
    - Affects both `scraped_data` and `real_estate_choices` tables

  3. Remove Unused Indexes
    - Drop `idx_real_estate_choices_created_at` (not being used)
    - Drop `idx_real_estate_choices_liked` (not being used)
    - Reduces storage overhead and maintenance cost

  4. Tables Affected
    - `scraped_data`: Added user_id index, optimized 4 RLS policies
    - `real_estate_choices`: Added scraped_data_id index, optimized 4 RLS policies, removed 2 unused indexes

  5. Important Notes
    - These changes improve both security and performance
    - No data loss or breaking changes
    - RLS policies maintain same security guarantees with better performance
    - Foreign key indexes enable faster joins and lookups
*/

-- ===========================
-- 1. Add Missing Foreign Key Indexes
-- ===========================

-- Index for scraped_data.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_scraped_data_user_id ON scraped_data(user_id);

-- Index for real_estate_choices.scraped_data_id foreign key
CREATE INDEX IF NOT EXISTS idx_real_estate_choices_scraped_data_id ON real_estate_choices(scraped_data_id);

-- ===========================
-- 2. Optimize RLS Policies for scraped_data
-- ===========================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Users can insert own scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Users can update own scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Users can delete own scraped data" ON scraped_data;

-- Recreate policies with SELECT wrapper for auth.uid()
CREATE POLICY "Users can view own scraped data"
  ON scraped_data FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own scraped data"
  ON scraped_data FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own scraped data"
  ON scraped_data FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own scraped data"
  ON scraped_data FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ===========================
-- 3. Optimize RLS Policies for real_estate_choices
-- ===========================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own real estate choices" ON real_estate_choices;
DROP POLICY IF EXISTS "Users can insert own real estate choices" ON real_estate_choices;
DROP POLICY IF EXISTS "Users can update own real estate choices" ON real_estate_choices;
DROP POLICY IF EXISTS "Users can delete own real estate choices" ON real_estate_choices;

-- Recreate policies with SELECT wrapper for auth.uid()
CREATE POLICY "Users can view own real estate choices"
  ON real_estate_choices
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own real estate choices"
  ON real_estate_choices
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own real estate choices"
  ON real_estate_choices
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own real estate choices"
  ON real_estate_choices
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ===========================
-- 4. Remove Unused Indexes
-- ===========================

-- Drop unused indexes that are not being utilized
DROP INDEX IF EXISTS idx_real_estate_choices_created_at;
DROP INDEX IF EXISTS idx_real_estate_choices_liked;
