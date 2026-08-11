/*
  # Create users table

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `role` (enum: owner, director, vice_director, employee, probation)
      - `employee_type` (enum: dealer, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users to read their own data
    - Add policy for directors to read all users
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('owner', 'director', 'vice_director', 'employee', 'probation');
CREATE TYPE employee_type AS ENUM ('dealer');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'probation',
  employee_type employee_type,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Directors can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'director'
    )
  );

CREATE POLICY "Directors can update user roles"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'director'
    )
  );

-- Insert demo users
INSERT INTO users (email, name, role, employee_type) VALUES
  ('direttore@azienda.com', 'Mario Rossi', 'director', NULL),
  ('concessionario@azienda.com', 'Marco Bianchi', 'employee', 'dealer');
