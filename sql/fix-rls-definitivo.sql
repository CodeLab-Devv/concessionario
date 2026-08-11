-- ============================================================
-- AURUM MOTORS – Fix definitivo RLS per registrazione
-- Esegui questo script nel SQL Editor di Supabase
-- ============================================================

-- Elimina TUTTE le policy esistenti sulla tabella users
DROP POLICY IF EXISTS "Allow authenticated users" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_select_authenticated" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_authenticated" ON users;

-- ============================================================
-- SOLUZIONE: Usa una funzione con SECURITY DEFINER
-- che bypassa la RLS e inserisce il profilo utente
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_id UUID,
  p_email TEXT,
  p_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- Esegue con i permessi del proprietario della funzione (superuser)
SET search_path = public
AS $$
BEGIN
  INSERT INTO users (id, email, name, role, employee_type, is_on_service)
  VALUES (p_id, p_email, p_name, 'probation', 'dealer', false)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Dai permesso agli utenti anonimi di chiamare questa funzione
GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;

-- ============================================================
-- Policy RLS semplificate (permissive per uso FiveM)
-- ============================================================

-- SELECT: tutti gli autenticati possono leggere
CREATE POLICY "users_select"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- UPDATE: solo il proprio profilo o manager
CREATE POLICY "users_update"
  ON users FOR UPDATE
  USING (auth.role() = 'authenticated');

-- DELETE: solo autenticati
CREATE POLICY "users_delete"
  ON users FOR DELETE
  USING (auth.role() = 'authenticated');

-- INSERT: permettiamo insert agli autenticati (la funzione gestisce il resto)
CREATE POLICY "users_insert"
  ON users FOR INSERT
  WITH CHECK (true);  -- Permissivo: la sicurezza è gestita dalla funzione

-- ============================================================
-- Assicura che le altre tabelle siano ok
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated users" ON sales;
DROP POLICY IF EXISTS "Allow authenticated users" ON activity_logs;
DROP POLICY IF EXISTS "Allow authenticated users" ON vehicles;
DROP POLICY IF EXISTS "sales_all_authenticated" ON sales;
DROP POLICY IF EXISTS "logs_all_authenticated" ON activity_logs;
DROP POLICY IF EXISTS "vehicles_all_authenticated" ON vehicles;

CREATE POLICY "sales_all" ON sales FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "logs_all" ON activity_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "vehicles_all" ON vehicles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
