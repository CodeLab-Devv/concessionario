alter table public.users
  add column if not exists presence_status text not null default 'inactive';

alter table public.users
  drop constraint if exists users_presence_status_check;

alter table public.users
  add constraint users_presence_status_check
  check (presence_status in ('available', 'inactive', 'busy', 'dnd', 'absent'));

update public.users
set presence_status = case
  when is_on_service = true then 'available'
  else 'inactive'
end
where presence_status is null
   or presence_status not in ('available', 'inactive', 'busy', 'dnd', 'absent');

create index if not exists idx_users_presence_status
  on public.users (presence_status);