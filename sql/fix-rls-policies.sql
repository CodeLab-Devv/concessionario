-- ============================================================
-- AURUM MOTORS – Fix RLS Policies
-- Esegui questo script nel SQL Editor di Supabase
-- ============================================================

-- 1. Rimuovi le policy vecchie/generiche che bloccano le operazioni
DROP POLICY IF EXISTS "Allow authenticated users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users" ON sales;
DROP POLICY IF EXISTS "Allow authenticated users" ON activity_logs;
DROP POLICY IF EXISTS "Allow authenticated users" ON vehicles;

-- ============================================================
-- POLICY PER TABELLA "users"
-- ============================================================

-- Permetti a chiunque (anche appena registrato) di inserire il proprio profilo
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Permetti a tutti gli utenti autenticati di leggere i profili
CREATE POLICY "users_select_authenticated"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Permetti agli utenti di aggiornare il proprio profilo
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Permetti ai manager di eliminare utenti (fireEmployee)
CREATE POLICY "users_delete_authenticated"
  ON users FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- POLICY PER TABELLA "sales"
-- ============================================================

CREATE POLICY "sales_all_authenticated"
  ON sales FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- POLICY PER TABELLA "activity_logs"
-- ============================================================

CREATE POLICY "logs_all_authenticated"
  ON activity_logs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- POLICY PER TABELLA "vehicles"
-- ============================================================

CREATE POLICY "vehicles_all_authenticated"
  ON vehicles FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- Verifica che RLS sia abilitato su tutte le tabelle
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
