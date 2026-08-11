/*
  # Remove username from log_activity function

  1. Function Changes
    - Remove `p_user_name` and `p_target_user_name` from `log_activity` function
*/

CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_action text,
  p_details text,
  p_target_user_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, details, target_user_id)
  VALUES (p_user_id, p_action, p_details, p_target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;