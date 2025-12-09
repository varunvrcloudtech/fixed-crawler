/*
  # Add Liked Status to Real Estate Choices

  1. Changes
    - Add `liked` column to `real_estate_choices` table
      - Boolean field to track if user has "liked" this choice
      - Defaults to false
      - Allows users to mark favorite properties

  2. Important Notes
    - This enables users to favorite/like specific choices
    - Liked status can be toggled on and off
    - Helps users prioritize their top property choices
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'real_estate_choices' AND column_name = 'liked'
  ) THEN
    ALTER TABLE real_estate_choices ADD COLUMN liked boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_real_estate_choices_liked ON real_estate_choices(user_id, liked) WHERE liked = true;
