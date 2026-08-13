create or replace function public.sync_auth_email_to_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.users
       set email = new.email
     where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row
when (new.email is distinct from old.email)
execute function public.sync_auth_email_to_users();
