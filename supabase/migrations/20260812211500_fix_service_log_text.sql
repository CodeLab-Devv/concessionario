BEGIN;

CREATE OR REPLACE FUNCTION public.audit_activity_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := auth.uid();
  target UUID := NULL;
  record_key TEXT := NULL;
  payload JSONB;
  old_payload JSONB;
  new_payload JSONB;
  action_name TEXT;
  detail_text TEXT;
  actor_name TEXT;
  target_name TEXT;
  role_before TEXT;
  role_after TEXT;
  slot_label TEXT;
  shift_start TEXT;
  shift_end TEXT;
  shift_date TEXT;
  note_text TEXT;
  severity_label TEXT;
  title_text TEXT;
BEGIN
  IF TG_TABLE_NAME = 'activity_logs' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  old_payload := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  new_payload := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  payload := COALESCE(new_payload, old_payload);

  actor := COALESCE(actor, NULLIF(payload ->> 'created_by', '')::UUID, NULLIF(payload ->> 'author_id', '')::UUID, NULLIF(payload ->> 'issued_by', '')::UUID, NULLIF(payload ->> 'user_id', '')::UUID);

  IF actor IS NOT NULL THEN
    SELECT u.name INTO actor_name FROM public.users u WHERE u.id = actor;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'users' THEN target := NULLIF(payload ->> 'id', '')::UUID;
    WHEN 'announcement_reads' THEN target := NULLIF(payload ->> 'user_id', '')::UUID;
    WHEN 'announcements' THEN target := NULLIF(payload ->> 'author_id', '')::UUID;
    WHEN 'daily_shifts' THEN target := NULLIF(payload ->> 'user_id', '')::UUID;
    WHEN 'shift_absences' THEN target := NULLIF(payload ->> 'user_id', '')::UUID;
    WHEN 'sales' THEN target := NULLIF(payload ->> 'employee_id', '')::UUID;
    WHEN 'disciplinary_warnings' THEN target := NULLIF(payload ->> 'employee_id', '')::UUID;
    ELSE target := NULL;
  END CASE;

  IF TG_TABLE_NAME = 'users' THEN
    target_name := payload ->> 'name';
  ELSIF target IS NOT NULL THEN
    SELECT u.name INTO target_name FROM public.users u WHERE u.id = target;
  END IF;

  record_key := COALESCE(payload ->> 'id', payload ->> 'token', payload ->> 'announcement_id', payload ->> 'user_id');

  IF TG_TABLE_NAME = 'announcement_reads' AND TG_OP <> 'INSERT' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'users' THEN
    IF TG_OP = 'UPDATE' AND (old_payload ->> 'is_on_service') IS DISTINCT FROM (new_payload ->> 'is_on_service') THEN
      IF COALESCE((new_payload ->> 'is_on_service')::BOOLEAN, FALSE) THEN
        action_name := 'Ingresso in servizio';
        detail_text := format('%s è entrato in servizio alle %s.', COALESCE(actor_name, target_name, 'L''utente'), to_char(COALESCE(NULLIF(new_payload ->> 'last_service_status_change', '')::timestamptz, now()), 'DD/MM/YYYY HH24:MI:SS'));
      ELSE
        action_name := 'Uscita dal servizio';
        detail_text := format('%s è uscito dal servizio alle %s.', COALESCE(actor_name, target_name, 'L''utente'), to_char(COALESCE(NULLIF(new_payload ->> 'last_service_status_change', '')::timestamptz, now()), 'DD/MM/YYYY HH24:MI:SS'));
      END IF;
    ELSIF TG_OP = 'UPDATE' AND (old_payload ->> 'role') IS DISTINCT FROM (new_payload ->> 'role') THEN
      role_before := CASE old_payload ->> 'role' WHEN 'owner' THEN 'Proprietario' WHEN 'director' THEN 'Direttore' WHEN 'vice_director' THEN 'Vice Direttore' WHEN 'employee' THEN 'Dipendente' WHEN 'probation' THEN 'In prova' ELSE COALESCE(old_payload ->> 'role', 'N/D') END;
      role_after := CASE new_payload ->> 'role' WHEN 'owner' THEN 'Proprietario' WHEN 'director' THEN 'Direttore' WHEN 'vice_director' THEN 'Vice Direttore' WHEN 'employee' THEN 'Dipendente' WHEN 'probation' THEN 'In prova' ELSE COALESCE(new_payload ->> 'role', 'N/D') END;
      action_name := 'Cambio ruolo';
      detail_text := format('Ruolo di %s modificato da %s a %s.', COALESCE(target_name, 'utente'), role_before, role_after);
    ELSIF TG_OP = 'UPDATE' AND (old_payload ->> 'availability') IS DISTINCT FROM (new_payload ->> 'availability') THEN
      action_name := 'Disponibilità modificata';
      detail_text := format('Disponibilità settimanale di %s aggiornata.', COALESCE(target_name, 'utente'));
    ELSIF TG_OP = 'INSERT' THEN
      role_after := CASE payload ->> 'role' WHEN 'owner' THEN 'Proprietario' WHEN 'director' THEN 'Direttore' WHEN 'vice_director' THEN 'Vice Direttore' WHEN 'employee' THEN 'Dipendente' WHEN 'probation' THEN 'In prova' ELSE COALESCE(payload ->> 'role', 'N/D') END;
      action_name := 'Profilo creato';
      detail_text := format('Creato il profilo di %s con ruolo %s.', COALESCE(target_name, 'utente'), role_after);
    ELSIF TG_OP = 'DELETE' THEN
      action_name := 'Profilo eliminato';
      detail_text := format('Eliminato il profilo di %s.', COALESCE(target_name, 'utente'));
    ELSE
      action_name := 'Profilo modificato';
      detail_text := format('Aggiornato il profilo di %s.', COALESCE(target_name, 'utente'));
    END IF;

  ELSIF TG_TABLE_NAME = 'sales' THEN
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'Vendita registrata' WHEN 'UPDATE' THEN 'Vendita modificata' ELSE 'Vendita eliminata' END;
    detail_text := format('%s la vendita di %s%s per %s: quantità %s, totale $ %s%s.', CASE TG_OP WHEN 'INSERT' THEN 'Registrata' WHEN 'UPDATE' THEN 'Modificata' ELSE 'Eliminata' END, COALESCE(payload ->> 'item_name', 'articolo'), CASE WHEN NULLIF(payload ->> 'car_model', '') IS NOT NULL THEN format(' (%s)', payload ->> 'car_model') ELSE '' END, COALESCE(target_name, payload ->> 'employee_name', 'dipendente'), COALESCE(payload ->> 'quantity', '1'), COALESCE(payload ->> 'total', '0'), CASE WHEN payload ->> 'discount_type' = 'employee' THEN ' con sconto dipendente' WHEN payload ->> 'discount_type' = 'collaboration' THEN ' con sconto collaborazione' ELSE '' END);

  ELSIF TG_TABLE_NAME = 'announcements' THEN
    title_text := COALESCE(NULLIF(payload ->> 'title', ''), 'Senza titolo');
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'Annuncio pubblicato' WHEN 'UPDATE' THEN 'Annuncio modificato' ELSE 'Annuncio eliminato' END;
    detail_text := CASE TG_OP WHEN 'INSERT' THEN format('Pubblicato l''annuncio «%s» da %s.', title_text, COALESCE(actor_name, target_name, 'utente')) WHEN 'UPDATE' THEN format('Modificato l''annuncio «%s».', title_text) ELSE format('Eliminato l''annuncio «%s».', title_text) END;

  ELSIF TG_TABLE_NAME = 'announcement_reads' THEN
    SELECT a.title INTO title_text FROM public.announcements a WHERE a.id = NULLIF(payload ->> 'announcement_id', '')::UUID;
    action_name := 'Annuncio visualizzato';
    detail_text := format('%s ha visualizzato l''annuncio «%s».', COALESCE(actor_name, target_name, 'L''utente'), COALESCE(title_text, 'senza titolo'));

  ELSIF TG_TABLE_NAME = 'daily_shifts' THEN
    shift_date := COALESCE(payload ->> 'shift_date', 'data non disponibile');
    shift_start := COALESCE(payload ->> 'start_time', '00:00:00');
    shift_end := COALESCE(payload ->> 'end_time', '00:00:00');
    slot_label := CASE WHEN shift_start >= '06:00:00' AND shift_start < '12:00:00' THEN 'Mattino' WHEN shift_start >= '12:00:00' AND shift_start < '18:00:00' THEN 'Pomeriggio' WHEN shift_start >= '18:00:00' THEN 'Sera' ELSE 'Tarda notte' END;
    note_text := NULLIF(payload ->> 'notes', '');
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'Turno assegnato' WHEN 'UPDATE' THEN 'Turno modificato' ELSE 'Turno rimosso' END;
    detail_text := format('%s per %s il %s, turno %s (%s–%s)%s.', CASE TG_OP WHEN 'INSERT' THEN 'Assegnato il turno' WHEN 'UPDATE' THEN 'Modificato il turno' ELSE 'Rimosso il turno' END, COALESCE(target_name, 'dipendente'), to_char(NULLIF(shift_date, '')::DATE, 'DD/MM/YYYY'), slot_label, left(shift_start, 5), left(shift_end, 5), CASE WHEN note_text IS NOT NULL THEN format(' — nota: %s', note_text) ELSE '' END);

  ELSIF TG_TABLE_NAME = 'shift_absences' THEN
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'Assenza registrata' WHEN 'UPDATE' THEN 'Assenza modificata' ELSE 'Assenza rimossa' END;
    slot_label := CASE payload ->> 'slot' WHEN 'mattino' THEN 'Mattino' WHEN 'pomeriggio' THEN 'Pomeriggio' WHEN 'sera' THEN 'Sera' WHEN 'tarda_notte' THEN 'Tarda notte' WHEN 'tutto_giorno' THEN 'Tutto il giorno' ELSE COALESCE(payload ->> 'slot', 'fascia non specificata') END;
    note_text := NULLIF(payload ->> 'note', '');
    detail_text := format('%s di %s per il %s — %s (%s–%s)%s.', CASE TG_OP WHEN 'INSERT' THEN 'Registrata un''assenza' WHEN 'UPDATE' THEN 'Modificata un''assenza' ELSE 'Rimossa un''assenza' END, COALESCE(target_name, 'dipendente'), to_char(NULLIF(payload ->> 'absence_date', '')::DATE, 'DD/MM/YYYY'), slot_label, left(COALESCE(payload ->> 'start_time', '00:00:00'), 5), left(COALESCE(payload ->> 'end_time', '00:00:00'), 5), CASE WHEN note_text IS NOT NULL THEN format(' — nota: %s', note_text) ELSE '' END);

  ELSIF TG_TABLE_NAME = 'disciplinary_warnings' THEN
    severity_label := CASE payload ->> 'severity' WHEN 'richiamo' THEN 'Richiamo' WHEN 'formale' THEN 'Richiamo formale' WHEN 'last_chance' THEN 'Ultima possibilità' ELSE COALESCE(payload ->> 'severity', 'Richiamo') END;
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'Richiamo disciplinare emesso' WHEN 'UPDATE' THEN 'Richiamo disciplinare modificato' ELSE 'Richiamo disciplinare rimosso' END;
    detail_text := format('%s per %s — %s: %s.', CASE TG_OP WHEN 'INSERT' THEN 'Emesso un richiamo disciplinare' WHEN 'UPDATE' THEN 'Modificato un richiamo disciplinare' ELSE 'Rimosso un richiamo disciplinare' END, COALESCE(target_name, 'dipendente'), severity_label, COALESCE(payload ->> 'reason', 'motivazione non disponibile'));

  ELSIF TG_TABLE_NAME = 'vehicles' THEN
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'Veicolo aggiunto' WHEN 'UPDATE' THEN 'Veicolo modificato' ELSE 'Veicolo rimosso' END;
    detail_text := format('%s il veicolo «%s» (%s) — prezzo $ %s.', CASE TG_OP WHEN 'INSERT' THEN 'Aggiunto' WHEN 'UPDATE' THEN 'Modificato' ELSE 'Rimosso' END, COALESCE(payload ->> 'name', 'senza nome'), COALESCE(payload ->> 'type', 'categoria non specificata'), COALESCE(payload ->> 'price', '0'));

  ELSIF TG_TABLE_NAME = 'pending_employee_registrations' THEN
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'Invito registrazione creato' WHEN 'UPDATE' THEN 'Invito registrazione modificato' ELSE 'Invito registrazione annullato' END;
    detail_text := format('%s per %s.', CASE TG_OP WHEN 'INSERT' THEN 'Creato un invito di registrazione' WHEN 'UPDATE' THEN 'Modificato un invito di registrazione' ELSE 'Annullato un invito di registrazione' END, COALESCE(payload ->> 'email', 'email non disponibile'));

  ELSE
    action_name := CASE TG_OP WHEN 'INSERT' THEN 'Elemento creato' WHEN 'UPDATE' THEN 'Elemento modificato' ELSE 'Elemento eliminato' END;
    detail_text := format('%s nel modulo %s.', action_name, replace(TG_TABLE_NAME, '_', ' '));
  END IF;

  INSERT INTO public.activity_logs (user_id, action, details, target_user_id, table_name, record_id, metadata)
  VALUES (actor, COALESCE(action_name, 'Attività sistema'), COALESCE(detail_text, 'Attività registrata.'), target, TG_TABLE_NAME, record_key, jsonb_build_object('operation', TG_OP, 'old', old_payload, 'new', new_payload, 'actor_name', actor_name, 'target_name', target_name));

  RETURN COALESCE(NEW, OLD);
END;
$$;

UPDATE public.activity_logs
SET
  action = CASE WHEN COALESCE((metadata -> 'new' ->> 'is_on_service')::boolean, false) THEN 'Ingresso in servizio' ELSE 'Uscita dal servizio' END,
  details = CASE WHEN COALESCE((metadata -> 'new' ->> 'is_on_service')::boolean, false)
    THEN format('%s è entrato in servizio alle %s.', COALESCE(metadata -> 'new' ->> 'name', 'L''utente'), to_char(COALESCE(NULLIF(metadata -> 'new' ->> 'last_service_status_change', '')::timestamptz, created_at), 'DD/MM/YYYY HH24:MI:SS'))
    ELSE format('%s è uscito dal servizio alle %s.', COALESCE(metadata -> 'new' ->> 'name', 'L''utente'), to_char(COALESCE(NULLIF(metadata -> 'new' ->> 'last_service_status_change', '')::timestamptz, created_at), 'DD/MM/YYYY HH24:MI:SS'))
  END
WHERE table_name = 'users'
  AND COALESCE(metadata ->> 'operation', '') = 'UPDATE'
  AND COALESCE(metadata -> 'old' ->> 'is_on_service', '') IS DISTINCT FROM COALESCE(metadata -> 'new' ->> 'is_on_service', '');

COMMIT;
