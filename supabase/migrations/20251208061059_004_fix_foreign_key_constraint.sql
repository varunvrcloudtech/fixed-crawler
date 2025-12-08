/*
  # Fix Foreign Key Constraint to Reference auth.users
  
  1. Problem Identified
    - The scraped_data table has a foreign key constraint that references public.users(id)
    - However, Supabase Auth stores users in auth.users, not public.users
    - This causes insert failures because user_id values exist in auth.users but not public.users
  
  2. Solution
    - Drop the incorrect foreign key constraint that references public.users
    - Create a new foreign key constraint that correctly references auth.users(id)
    - This will allow inserts to work properly with Supabase Auth user IDs
  
  3. Impact
    - Users will now be able to save scraped data successfully
    - The foreign key will properly validate against the auth.users table
    - ON DELETE CASCADE ensures cleanup when users are deleted
*/

-- Drop the incorrect foreign key constraint
ALTER TABLE scraped_data 
DROP CONSTRAINT IF EXISTS scraped_data_user_id_fkey;

-- Add the correct foreign key constraint that references auth.users
ALTER TABLE scraped_data 
ADD CONSTRAINT scraped_data_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;
