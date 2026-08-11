-- Mantiene il database dedicato esclusivamente al concessionario Aurum Motors.
BEGIN;

-- Rimuove il modulo legacy non usato dall'applicazione.
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TYPE IF EXISTS public.job_category;
DROP TYPE IF EXISTS public.job_status;

-- Elimina la funzione legacy che creava un account predefinito.
DROP FUNCTION IF EXISTS public.setup_owner_account();

-- Abilita il ruolo proprietario anche nei database creati con lo schema iniziale.
DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';
EXCEPTION
  WHEN undefined_object THEN NULL;
END;
$$;

-- Uniforma le tipologie dipendente al solo concessionario.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_employee_type_check,
  ALTER COLUMN employee_type DROP DEFAULT,
  ALTER COLUMN employee_type TYPE text USING employee_type::text;

UPDATE public.users
SET employee_type = 'dealer'
WHERE employee_type IS NOT NULL
  AND employee_type <> 'dealer';

DROP TYPE IF EXISTS public.employee_type;

ALTER TABLE public.users
  ADD CONSTRAINT users_employee_type_check
  CHECK (employee_type IS NULL OR employee_type = 'dealer');

-- Mantiene nello storico solo vendite del concessionario.
ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_type_check,
  DROP CONSTRAINT IF EXISTS sales_category_check,
  ALTER COLUMN type DROP DEFAULT,
  ALTER COLUMN category DROP DEFAULT,
  ALTER COLUMN type TYPE text USING type::text,
  ALTER COLUMN category TYPE text USING category::text;

UPDATE public.sales
SET type = 'sale'
WHERE type <> 'sale';

UPDATE public.sales
SET category = 'concessionari'
WHERE category <> 'concessionari';

DROP TYPE IF EXISTS public.sale_type;
DROP TYPE IF EXISTS public.sale_category;

ALTER TABLE public.sales
  ALTER COLUMN type SET DEFAULT 'sale',
  ALTER COLUMN category SET DEFAULT 'concessionari',
  ADD CONSTRAINT sales_type_check CHECK (type = 'sale'),
  ADD CONSTRAINT sales_category_check CHECK (category = 'concessionari');

COMMIT;
