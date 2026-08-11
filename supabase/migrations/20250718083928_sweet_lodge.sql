/*
  # Setup demo data and initial director

  This migration should be run after creating the first user account.
  It will promote the first registered user to director role.
*/

-- Function to promote first user to director
CREATE OR REPLACE FUNCTION promote_first_user_to_director()
RETURNS void AS $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user (oldest created_at)
  SELECT id INTO first_user_id 
  FROM users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- If we found a user, make them director
  IF first_user_id IS NOT NULL THEN
    UPDATE users 
    SET role = 'director'::user_role 
    WHERE id = first_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This function can be called manually after the first user registers
-- Or you can set up a trigger to automatically promote the first user