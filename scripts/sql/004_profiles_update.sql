-- Update profiles to include email and password_hash and ensure uniqueness
alter table public.profiles
  add column if not exists email text,
  add column if not exists password_hash text;

-- Email must be unique and present for app auth (we keep linkage to auth.users(id))
create unique index if not exists profiles_email_unique on public.profiles(lower(email));

-- Backfill/normalize nulls if needed (optional; skip if fresh project)
-- update public.profiles set email = coalesce(email, ''), password_hash = coalesce(password_hash, '');

-- Harden RLS for profiles as they now carry sensitive fields
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = auth.uid());
