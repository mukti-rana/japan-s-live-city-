-- LIVE CITY: per-user favorites and preferences.
--
-- Run this once in your Supabase project (SQL Editor -> New query -> paste
-- -> Run). Nothing in the app creates these tables automatically. Until it
-- is run, signed-in saving will fail gracefully and the app keeps working.
--
-- Row Level Security is enabled on both tables: a signed-in user can only
-- ever read, add, or remove their own rows. Guests have no access at all.

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('city', 'place', 'line')),
  key text not null check (char_length(key) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (user_id, kind, key)
);

alter table public.favorites enable row level security;

create policy "Users can read their own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can add their own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

create table if not exists public.user_preferences (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  language text check (language in ('en', 'ja', 'ne', 'hi', 'zh', 'ko')),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can read their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can add their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
