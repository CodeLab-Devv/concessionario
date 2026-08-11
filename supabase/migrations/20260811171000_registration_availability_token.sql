create table if not exists public.pending_employee_registrations (
  token uuid primary key default gen_random_uuid(),
  email text not null,
  availability text,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now()
);

alter table public.pending_employee_registrations enable row level security;

create index if not exists pending_employee_registrations_email_idx
  on public.pending_employee_registrations (email);
create index if not exists pending_employee_registrations_expires_idx
  on public.pending_employee_registrations (expires_at);

create or replace function public.save_registration_availability(p_email text, p_availability text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token uuid;
begin
  delete from public.pending_employee_registrations where expires_at < now();
  insert into public.pending_employee_registrations (email, availability)
  values (lower(trim(p_email)), nullif(trim(p_availability), ''))
  returning token into v_token;
  return v_token;
end;
$$;

create or replace function public.apply_registration_availability(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration public.pending_employee_registrations%rowtype;
begin
  select * into v_registration
  from public.pending_employee_registrations
  where token = p_token and expires_at > now()
  for update;

  if not found then
    return false;
  end if;

  update public.users
  set availability = v_registration.availability
  where lower(email) = v_registration.email;

  delete from public.pending_employee_registrations where token = p_token;
  return found;
end;
$$;

revoke all on table public.pending_employee_registrations from anon, authenticated, public;
grant execute on function public.save_registration_availability(text, text) to anon, authenticated;
grant execute on function public.apply_registration_availability(uuid) to anon, authenticated;