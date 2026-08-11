-- Add service status columns to users table
ALTER TABLE users
ADD COLUMN is_on_service BOOLEAN DEFAULT FALSE,
ADD COLUMN last_service_status_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create a function to update the last_service_status_change timestamp
CREATE OR REPLACE FUNCTION update_service_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_on_service IS DISTINCT FROM OLD.is_on_service THEN
        NEW.last_service_status_change = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the timestamp when service status changes
DROP TRIGGER IF EXISTS update_service_status_trigger ON users;
CREATE TRIGGER update_service_status_trigger
BEFORE UPDATE OF is_on_service ON users
FOR EACH ROW
EXECUTE FUNCTION update_service_status_change();

-- Create an index for faster queries on service status
CREATE INDEX idx_users_service_status ON users(is_on_service, role);

-- Grant necessary permissions
GRANT SELECT, UPDATE (is_on_service) ON users TO authenticated;

-- Add RLS policy for service status updates
CREATE POLICY "Users can update their own service status"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Add RLS policy for viewing service status (managers and above can view all)
CREATE POLICY "Managers can view all service statuses"
ON users FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'director', 'vice_director')
    )
  )
);
