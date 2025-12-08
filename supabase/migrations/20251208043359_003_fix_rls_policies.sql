/*
  # Fix Row Level Security Policies

  1. Security Issue Identified
    - Current policies use `USING (true)` which allows any authenticated user to access all data
    - This is a critical security vulnerability

  2. Changes
    - Drop all existing insecure policies
    - Create new policies that properly check user_id = auth.uid()
    - Ensures users can ONLY access their own scraped data

  3. New Policies
    - SELECT: Users can only view their own data
    - INSERT: Users can only insert data with their own user_id
    - UPDATE: Users can only update their own data
    - DELETE: Users can only delete their own data
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated read access for scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Allow authenticated insert for scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Allow authenticated update for scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Allow authenticated delete for scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Users can view own scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Users can insert own scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Users can update own scraped data" ON scraped_data;
DROP POLICY IF EXISTS "Users can delete own scraped data" ON scraped_data;

-- Create secure policies that check user ownership
CREATE POLICY "Users can view own scraped data"
  ON scraped_data FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own scraped data"
  ON scraped_data FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own scraped data"
  ON scraped_data FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own scraped data"
  ON scraped_data FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
