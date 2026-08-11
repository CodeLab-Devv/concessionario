-- Prevent assigning an absent employee to a shift.
-- Applies to INSERT and UPDATE on daily_shifts so the rule is enforced
-- even if the client bypasses the UI.

CREATE OR REPLACE FUNCTION prevent_absent_user_shift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shift_slot TEXT;
  conflicting_absence RECORD;
BEGIN
  shift_slot := CASE
    WHEN EXTRACT(HOUR FROM NEW.start_time) >= 6 AND EXTRACT(HOUR FROM NEW.start_time) < 12 THEN 'mattino'
    WHEN EXTRACT(HOUR FROM NEW.start_time) >= 12 AND EXTRACT(HOUR FROM NEW.start_time) < 18 THEN 'pomeriggio'
    WHEN EXTRACT(HOUR FROM NEW.start_time) >= 18 THEN 'sera'
    ELSE 'tarda_notte'
  END;

  SELECT id, slot
    INTO conflicting_absence
  FROM shift_absences
  WHERE user_id = NEW.user_id
    AND absence_date = NEW.shift_date
    AND (slot = 'tutto_giorno' OR slot = shift_slot)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'DIPENDENTE_ASSENTE: impossibile assegnare il dipendente al turno %, perché risulta assente per questa fascia.', shift_slot
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_absent_user_shift ON daily_shifts;

CREATE TRIGGER trg_prevent_absent_user_shift
BEFORE INSERT OR UPDATE OF user_id, shift_date, start_time, end_time
ON daily_shifts
FOR EACH ROW
EXECUTE FUNCTION prevent_absent_user_shift();

COMMENT ON FUNCTION prevent_absent_user_shift() IS
  'Blocks daily_shifts assignments when the employee has a matching slot or all-day absence.';
