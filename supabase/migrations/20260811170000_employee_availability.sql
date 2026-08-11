alter table public.users add column if not exists availability text;

create or replace function public.sync_user_availability_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'availability' then
    update public.users
      set availability = nullif(new.raw_user_meta_data ->> 'availability', '')
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_availability on auth.users;
create trigger on_auth_user_availability
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.sync_user_availability_from_auth();

alter table public.users replica identity full;

-- Make realtime employee profile changes available to the dashboard.
do $$
begin
  alter publication supabase_realtime add table public.users;
exception when duplicate_object then
  null;
end $$;