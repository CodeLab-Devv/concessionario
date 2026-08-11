-- ============================================================
-- AURUM MOTORS – Database Setup per Supabase
-- Concessionario FiveM – Gestione Dipendenti e Vendite
-- ============================================================
-- Esegui questo script nella sezione "SQL Editor" di Supabase
-- ATTENZIONE: Se hai già dati esistenti, esegui prima le query
-- di cleanup indicate in fondo al file.
-- ============================================================

-- Tabella utenti
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'director', 'vice_director', 'employee', 'probation')),
  employee_type TEXT CHECK (employee_type IN ('dealer')),
  is_on_service BOOLEAN DEFAULT FALSE,
  last_service_status_change TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella vendite (solo concessionario)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES users(id),
  employee_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  car_model TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale')),
  category TEXT NOT NULL CHECK (category IN ('concessionari')),
  discount_type TEXT CHECK (discount_type IN ('employee', 'collaboration')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella log attività
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella veicoli (catalogo per il concessionario)
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- FUNZIONI RPC
-- ============================================================

-- Funzione per loggare le attività
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_details TEXT,
  p_target_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, details, target_user_id)
  VALUES (p_user_id, p_action, p_details, p_target_user_id);
END;
$$ LANGUAGE plpgsql;

-- Funzione per reset totale dati (vendite e log)
CREATE OR REPLACE FUNCTION reset_all_data()
RETURNS VOID AS $$
BEGIN
  DELETE FROM activity_logs WHERE action != 'Reset Totale';
  DELETE FROM sales WHERE created_at >= '1900-01-01';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Policy per permettere a tutti gli utenti autenticati di leggere e scrivere
CREATE POLICY "Allow authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON activity_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON vehicles FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- DATI INIZIALI
-- ============================================================

-- Veicoli di esempio per il catalogo (opzionale, adattare ai veicoli del server FiveM)
INSERT INTO vehicles (name, type, price) VALUES
  ('Zentorno', 'Super', 950000),
  ('Adder', 'Super', 1000000),
  ('Infernus', 'Super', 440000),
  ('Entity XF', 'Super', 795000),
  ('Turismo R', 'Super', 500000),
  ('Osiris', 'Super', 1950000),
  ('T20', 'Super', 2200000),
  ('Vacca', 'Super', 240000),
  ('Cheetah', 'Super', 650000),
  ('Banshee 900R', 'Super', 565000),
  ('Comet', 'Sports', 100000),
  ('Jester', 'Sports', 240000),
  ('Feltzer', 'Sports', 145000),
  ('Rapid GT', 'Sports', 132500),
  ('Elegy RH8', 'Sports', 95000),
  ('Schwartzer', 'Sports', 231000),
  ('Buffalo S', 'Sports', 120000),
  ('Sultan RS', 'Sports', 795000),
  ('Massacro', 'Sports', 275000),
  ('Carbonizzare', 'Sports', 195000),
  ('Oracle XS', 'SUV', 82000),
  ('FQ2', 'SUV', 45000),
  ('Granger', 'SUV', 35000),
  ('Cavalcade', 'SUV', 55000),
  ('Huntley', 'SUV', 95000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTE PER CLEANUP (se database già esistente)
-- ============================================================
-- Per aggiornare un database esistente, esegui la migrazione
-- `20260810000000_aurum_motors_cleanup.sql` dalla cartella `supabase/migrations`.
-- ============================================================
