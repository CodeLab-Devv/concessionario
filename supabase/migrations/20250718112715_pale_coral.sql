/*
  # Fix RLS policies to prevent infinite recursion

  1. Security Changes
    - Drop existing problematic policies that cause recursion
    - Create simple, non-recursive policies for users table
    - Allow authenticated users to insert their own profile
    - Allow users to read their own data
    - Allow service role to manage all users (for admin functions)

  2. Policy Structure
    - INSERT: Allow users to create their own profile using auth.uid()
    - SELECT: Allow users to read their own data, plus service role access
    - UPDATE: Allow users to update their own data, plus service role access
    - DELETE: Only allow service role to delete users
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Directors can read all users" ON users;
DROP POLICY IF EXISTS "Directors can update user roles" ON users;

-- Create simple, non-recursive policies
CREATE POLICY "Enable insert for authenticated users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable read for own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable update for own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for service role"
  ON users
  FOR DELETE
  TO service_role
  USING (true);

-- Allow service role full access for admin operations
CREATE POLICY "Enable all for service role"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);