-- WordifyAI Core Schema (run in Supabase SQL editor)
-- Uses auth.users for canonical users. We keep a public profiles table if needed later.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Profiles (optional mirror of auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

-- Lists
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Words
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  text text not null,
  note text,
  created_at timestamptz not null default now(),

  -- progress stats
  correct int not null default 0,
  wrong int not null default 0,
  learned boolean not null default false,
  last_reviewed_at timestamptz
);

-- Meanings (multiple per word)
create table if not exists public.meanings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  meaning text not null,
  position int not null default 0,
  -- exactly one may be selected per word
  is_selected boolean not null default false
);

-- Examples (multiple per word)
create table if not exists public.examples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  text text not null,
  position int not null default 0
);

-- Reviews (per answer during a session)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  correct boolean not null,
  reviewed_at timestamptz not null default now()
);

-- Optional SRS fields per word
alter table public.words
  add column if not exists srs_due_at timestamptz,
  add column if not exists srs_interval_days int,
  add column if not exists srs_ease float;
