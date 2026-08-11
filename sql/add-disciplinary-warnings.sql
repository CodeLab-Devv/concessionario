-- Sistema richiami disciplinari
CREATE TABLE IF NOT EXISTS public.disciplinary_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 3),
  severity TEXT NOT NULL DEFAULT 'richiamo' CHECK (severity IN ('richiamo', 'formale')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS disciplinary_warnings_employee_idx
  ON public.disciplinary_warnings(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS disciplinary_warnings_created_idx
  ON public.disciplinary_warnings(created_at DESC);

ALTER TABLE public.disciplinary_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage disciplinary warnings" ON public.disciplinary_warnings;
DROP POLICY IF EXISTS "Users read own disciplinary warnings" ON public.disciplinary_warnings;

CREATE POLICY "Owners manage disciplinary warnings"
ON public.disciplinary_warnings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'owner'
  )
)
WITH CHECK (
  issued_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'owner'
  )
);

CREATE POLICY "Users read own disciplinary warnings"
ON public.disciplinary_warnings
FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

COMMENT ON TABLE public.disciplinary_warnings IS 'Richiami disciplinari assegnati dai proprietari ai dipendenti';
