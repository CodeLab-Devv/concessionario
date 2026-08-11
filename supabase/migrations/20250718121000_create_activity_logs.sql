/*
  # Create activity_logs table

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `action` (text)
      - `details` (text)
      - `timestamp` (timestamp)
      - `target_user_id` (uuid, nullable)

  2. Security
    - Enable RLS on `activity_logs` table
    - Add policies for authenticated users to read their own logs
    - Add policy for directors to read all logs
*/

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  target_user_id uuid
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own logs" 
  ON activity_logs 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Directors can read all logs" 
  ON activity_logs 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'director'
    )
  );