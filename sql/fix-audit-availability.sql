-- ============================================================
-- Fix audit trigger for availability / daily shifts
-- ============================================================
-- PostgreSQL trigger records are table-specific. Referencing
-- NEW/OLD.is_on_service directly from a trigger also attached to
-- daily_shifts (or other tables) raises:
--   record "old" has no field "is_on_service"
--
-- Convert trigger rows to JSONB first, then inspect optional
-- columns by key. This keeps the same audit trigger reusable
-- across users, daily_shifts, shift_absences and announcements.
-- ============================================================

CREATE OR REPLACE FUNCTION audit_activity_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_data JSONB := CASE
    WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD)
    ELSE '{}'::jsonb
  END;
  new_data JSONB := CASE
    WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW)
    ELSE '{}'::jsonb
  END;
  actor_id UUID;
  target_id UUID;
  details TEXT;
BEGIN
  -- Resolve the actor without assuming every table has the same columns.
  BEGIN
    actor_id := COALESCE(
      NULLIF(new_data ->> 'created_by', '')::UUID,
      NULLIF(new_data ->> 'user_id', '')::UUID,
      NULLIF(old_data ->> 'created_by', '')::UUID,
      NULLIF(old_data ->> 'user_id', '')::UUID
    );
  EXCEPTION WHEN invalid_text_representation THEN
    actor_id := NULL;
  END;

  -- Users are the only table where is_on_service is meaningful.
  IF TG_TABLE_NAME = 'users'
     AND TG_OP = 'UPDATE'
     AND old_data ? 'is_on_service'
     AND new_data ? 'is_on_service'
     AND old_data ->> 'is_on_service' IS DISTINCT FROM new_data ->> 'is_on_service'
  THEN
    BEGIN
      target_id := NULLIF(new_data ->> 'id', '')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      target_id := NULL;
    END;

    details := format(
      'Stato servizio: %s → %s',
      COALESCE(old_data ->> 'is_on_service', 'false'),
      COALESCE(new_data ->> 'is_on_service', 'false')
    );
  ELSE
    details := format(
      '%s su %s%s',
      TG_OP,
      TG_TABLE_NAME,
      CASE
        WHEN COALESCE(new_data ->> 'id', old_data ->> 'id') IS NOT NULL
          THEN format(' (id: %s)', COALESCE(new_data ->> 'id', old_data ->> 'id'))
        ELSE ''
      END
    );
  END IF;

  INSERT INTO activity_logs (user_id, action, details, target_user_id)
  VALUES (
    actor_id,
    lower(TG_OP) || '_' || TG_TABLE_NAME,
    details,
    target_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION audit_activity_changes() IS
  'Reusable audit trigger. Uses JSONB for optional columns so tables without is_on_service do not fail.';
