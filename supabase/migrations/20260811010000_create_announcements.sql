-- Announcements published by management and acknowledged by employees.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  content text not null check (char_length(trim(content)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create index if not exists announcements_created_at_idx on public.announcements(created_at desc);
create index if not exists announcements_author_id_idx on public.announcements(author_id);
create index if not exists announcement_reads_user_id_idx on public.announcement_reads(user_id);

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.users where id = auth.uid() limit 1;
$$;

revoke all on function public.current_staff_role() from public;
grant execute on function public.current_staff_role() to authenticated;

alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

drop policy if exists "Staff can read announcements" on public.announcements;
create policy "Staff can read announcements"
on public.announcements for select to authenticated
using (true);

drop policy if exists "Management can create announcements" on public.announcements;
create policy "Management can create announcements"
on public.announcements for insert to authenticated
with check (
  author_id = auth.uid()
  and public.current_staff_role() in ('owner', 'director', 'vice_director')
);

drop policy if exists "Authors can update announcements" on public.announcements;
create policy "Authors can update announcements"
on public.announcements for update to authenticated
using (
  author_id = auth.uid()
  and public.current_staff_role() in ('owner', 'director', 'vice_director')
)
with check (
  author_id = auth.uid()
  and public.current_staff_role() in ('owner', 'director', 'vice_director')
);

drop policy if exists "Authors can delete announcements" on public.announcements;
create policy "Authors can delete announcements"
on public.announcements for delete to authenticated
using (
  author_id = auth.uid()
  and public.current_staff_role() in ('owner', 'director', 'vice_director')
);

drop policy if exists "Users can read own announcement receipts" on public.announcement_reads;
create policy "Users can read own announcement receipts"
on public.announcement_reads for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Management can read all announcement receipts" on public.announcement_reads;
create policy "Management can read all announcement receipts"
on public.announcement_reads for select to authenticated
using (public.current_staff_role() in ('owner', 'director', 'vice_director'));

drop policy if exists "Users can acknowledge announcements" on public.announcement_reads;
create policy "Users can acknowledge announcements"
on public.announcement_reads for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own announcement receipt" on public.announcement_reads;
create policy "Users can update own announcement receipt"
on public.announcement_reads for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.announcement_reads;
