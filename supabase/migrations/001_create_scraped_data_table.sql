/*
  # AI Web Scraper Database Schema with Supabase Auth
  
  This migration creates the scraped_data table that works with Supabase Auth.
  Users are authenticated via Supabase Auth (Google OAuth, Email/Password),
  and their data is protected using Row Level Security (RLS).

  1. Tables
    - `scraped_data`: Stores all scraped website data
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `scrape_type` (text) - 'real_estate' or 'general'
      - `url` (text) - URL that was scraped
      - `title` (text) - Title/description of the scrape
      - `content` (jsonb) - Full scraped content
      - `created_at` (timestamptz) - When the scrape was saved

  2. Security
    - RLS enabled on scraped_data table
    - Users can only access their own data
    - Policies for SELECT, INSERT, UPDATE, DELETE

  3. Indexes
    - Index on user_id for faster user queries
    - Index on created_at for sorting
    - Index on scrape_type for filtering
*/

-- Create scraped_data table
CREATE TABLE IF NOT EXISTS scraped_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scrape_type text NOT NULL CHECK (scrape_type IN ('real_estate', 'general')),
  url text NOT NULL,
  title text,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scraped_data_user_id ON scraped_data(user_id);
CREATE INDEX IF NOT EXISTS idx_scraped_data_created_at ON scraped_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_data_scrape_type ON scraped_data(scrape_type);

-- Enable Row Level Security
ALTER TABLE scraped_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scraped_data table
-- Users can view only their own scraped data
CREATE POLICY "Users can view own scraped data"
  ON scraped_data FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own scraped data
CREATE POLICY "Users can insert own scraped data"
  ON scraped_data FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own scraped data
CREATE POLICY "Users can update own scraped data"
  ON scraped_data FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own scraped data
CREATE POLICY "Users can delete own scraped data"
  ON scraped_data FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
