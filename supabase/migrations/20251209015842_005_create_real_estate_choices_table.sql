/*
  # Create Real Estate Choices Table

  1. New Tables
    - `real_estate_choices`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `scraped_data_id` (uuid, references scraped_data, nullable)
      - `location` (text)
      - `property_type` (text)
      - `price_range` (text)
      - `distance_from` (text, nullable)
      - `max_distance` (text, nullable)
      - `content_preview` (text, nullable)
      - `source_url` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `real_estate_choices` table
    - Add policy for authenticated users to view their own choices
    - Add policy for authenticated users to insert their own choices
    - Add policy for authenticated users to update their own choices
    - Add policy for authenticated users to delete their own choices

  3. Important Notes
    - This table stores user-selected real estate listings
    - Users can add scraped data to their "My Choices" list
    - Each choice stores key metadata for easy viewing
    - Users can only access their own choices through RLS policies
*/

CREATE TABLE IF NOT EXISTS real_estate_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scraped_data_id uuid REFERENCES scraped_data(id) ON DELETE SET NULL,
  location text NOT NULL,
  property_type text NOT NULL DEFAULT 'N/A',
  price_range text NOT NULL DEFAULT 'N/A',
  distance_from text,
  max_distance text,
  content_preview text,
  source_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE real_estate_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own real estate choices"
  ON real_estate_choices
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own real estate choices"
  ON real_estate_choices
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own real estate choices"
  ON real_estate_choices
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own real estate choices"
  ON real_estate_choices
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_real_estate_choices_user_id ON real_estate_choices(user_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_choices_created_at ON real_estate_choices(created_at DESC);
