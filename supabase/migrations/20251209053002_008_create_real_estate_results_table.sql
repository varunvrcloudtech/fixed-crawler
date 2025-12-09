/*
  # Create Real Estate Results Table

  1. New Tables
    - `real_estate_results`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `location` (text) - property address/location
      - `price` (text) - price of the property
      - `beds` (text) - number of bedrooms
      - `baths` (text) - number of bathrooms
      - `sqft` (text) - square footage
      - `property_type` (text) - type of property
      - `source_url` (text) - URL where data was scraped from
      - `content_preview` (text) - preview of property details
      - `liked` (boolean) - whether user liked this property
      - `created_at` (timestamptz) - timestamp of when record was created

  2. Security
    - Enable RLS on `real_estate_results` table
    - Add SELECT policy for authenticated users to view their own results
    - Add INSERT policy for authenticated users to insert their own results
    - Add UPDATE policy for authenticated users to update their own results
    - Add DELETE policy for authenticated users to delete their own results

  3. Indexes
    - Add index on `user_id` for faster user-specific queries
    - Add index on `liked` and `user_id` for filtering liked properties

  4. Important Notes
    - This table stores scraped real estate results from the browser search feature
    - Users can browse real estate websites and scrape visible listings
    - Each result can be liked/unliked by the user
    - Users can only access their own scraped results through RLS policies
    - The `liked` field allows users to favorite specific properties
*/

CREATE TABLE IF NOT EXISTS real_estate_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location text NOT NULL,
  price text NOT NULL DEFAULT 'N/A',
  beds text DEFAULT 'N/A',
  baths text DEFAULT 'N/A',
  sqft text DEFAULT 'N/A',
  property_type text DEFAULT 'N/A',
  source_url text,
  content_preview text,
  liked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE real_estate_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own real estate results"
  ON real_estate_results
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own real estate results"
  ON real_estate_results
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own real estate results"
  ON real_estate_results
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own real estate results"
  ON real_estate_results
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_real_estate_results_user_id ON real_estate_results(user_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_results_user_liked ON real_estate_results(user_id, liked) WHERE liked = true;
