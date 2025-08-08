-- Enable RLS
alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.words enable row level security;
alter table public.meanings enable row level security;
alter table public.examples enable row level security;
alter table public.reviews enable row level security;

-- Basic owner policies
create policy if not exists "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy if not exists "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy if not exists "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

create policy if not exists "lists_full_access"
  on public.lists for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "words_full_access"
  on public.words for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "meanings_full_access"
  on public.meanings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "examples_full_access"
  on public.examples for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "reviews_full_access"
  on public.reviews for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
