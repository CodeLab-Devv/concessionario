alter table public.daily_shifts
  add column if not exists supervisor_id uuid null references public.users(id) on delete set null;

create index if not exists daily_shifts_supervisor_id_idx
  on public.daily_shifts(supervisor_id);
