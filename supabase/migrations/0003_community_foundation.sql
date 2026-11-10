-- LIVE CITY JAPAN — Community, phase 1: foundation.
--
-- Creates the tables the Community section stands on:
--   profiles               public identity for each account (username, avatar, bio)
--   moderators             who may moderate (only editable from the SQL editor)
--   community_categories   the topic list (Nature, Food, ...), editable by moderators
--   community_settings     one row of switchable rules (e.g. approve posts first)
--   community_posts        a shared experience, tied to an area (prefecture) and optionally a place
--   community_post_images  the photos of a post (files live in Storage; added in phase 2)
--
-- Safe to run more than once: it only creates what is missing and never drops
-- or rewrites existing tables or data. Run it in the Supabase SQL editor.
--
-- Security model:
--   * Everything has Row Level Security on.
--   * Anyone (even signed out) can read PUBLISHED posts and public profiles.
--   * People can only create, edit and delete their own content.
--   * Status, counters and ownership of a post cannot be changed by its author —
--     triggers enforce that, whatever the browser sends.
--   * Moderator rights come only from the `moderators` table, which no browser
--     request can read or write. Nothing here uses the service-role key.

-- ───────────────────────── profiles ─────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_display_name_len check (char_length(display_name) <= 40),
  constraint profiles_bio_len check (char_length(bio) <= 280)
);

alter table public.profiles enable row level security;

-- Profiles are public by design: they hold only a username, optional display
-- name, avatar and short bio. Email addresses stay in auth.users, never here.
drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select using (true);

drop policy if exists "Users can edit their own profile" on public.profiles;
create policy "Users can edit their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Every account gets a profile automatically, with a neutral generated
-- username they can change later ("traveler_" + 8 characters of their id).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'traveler_' || substr(replace(new.id::text, '-', ''), 1, 8))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that already exist get a profile too.
insert into public.profiles (id, username)
select id, 'traveler_' || substr(replace(id::text, '-', ''), 1, 8)
from auth.users
on conflict (id) do nothing;

-- ───────────────────────── moderators ─────────────────────────

create table if not exists public.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Row Level Security with NO policies: no browser request can read or change
-- this table. Add a moderator from the SQL editor (see the note at the end).
alter table public.moderators enable row level security;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.moderators where user_id = auth.uid());
$$;

revoke all on function public.is_moderator() from public;
grant execute on function public.is_moderator() to anon, authenticated;

-- ───────────────────────── categories ─────────────────────────

create table if not exists public.community_categories (
  slug text primary key,
  name_en text not null,
  name_ja text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  constraint community_categories_slug_format check (slug ~ '^[a-z0-9-]{2,40}$')
);

alter table public.community_categories enable row level security;

drop policy if exists "Categories are public" on public.community_categories;
create policy "Categories are public" on public.community_categories
  for select using (is_active or public.is_moderator());

drop policy if exists "Moderators manage categories" on public.community_categories;
create policy "Moderators manage categories" on public.community_categories
  for all using (public.is_moderator()) with check (public.is_moderator());

insert into public.community_categories (slug, name_en, name_ja, sort_order) values
  ('nature', 'Nature', '自然', 1),
  ('food', 'Food', 'グルメ', 2),
  ('culture', 'Culture', '文化', 3),
  ('temples-shrines', 'Temples & Shrines', '寺社', 4),
  ('shopping', 'Shopping', 'ショッピング', 5),
  ('nightlife', 'Nightlife', 'ナイトライフ', 6),
  ('festivals', 'Festivals', '祭り', 7),
  ('architecture', 'Architecture', '建築', 8),
  ('photography', 'Photography', '写真', 9),
  ('hidden-places', 'Hidden Places', '穴場', 10),
  ('activities', 'Activities', 'アクティビティ', 11),
  ('local-experiences', 'Local Experiences', '地元体験', 12),
  ('seasonal', 'Seasonal Experiences', '季節の体験', 13)
on conflict (slug) do nothing;

-- ───────────────────────── settings ─────────────────────────

-- A single row. Moderators can change the rules without a code change.
create table if not exists public.community_settings (
  id boolean primary key default true,
  require_approval boolean not null default false,   -- true: new posts wait as 'pending'
  max_posts_per_hour integer not null default 10,
  max_images_per_post integer not null default 8,
  updated_at timestamptz not null default now(),
  constraint community_settings_single_row check (id)
);

insert into public.community_settings (id) values (true) on conflict (id) do nothing;

alter table public.community_settings enable row level security;

drop policy if exists "Settings are readable" on public.community_settings;
create policy "Settings are readable" on public.community_settings for select using (true);

drop policy if exists "Moderators change settings" on public.community_settings;
create policy "Moderators change settings" on public.community_settings
  for update using (public.is_moderator()) with check (public.is_moderator());

-- ───────────────────────── posts ─────────────────────────

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  caption text not null default '',
  -- Where: the prefecture id used across the site ('nara', 'tokyo', ...).
  -- The app checks it against the real list.
  area_id text not null,
  city_label text,            -- optional free text: city, neighbourhood or street
  place_ref text,             -- optional Explore catalogue id (Wikidata, e.g. 'Q29682')
  place_label text,           -- optional free text for places not in the catalogue
  category_slug text not null references public.community_categories(slug),
  visit_date date,
  -- Reserved: the author's explicit permission to show a rough location. Exact
  -- GPS and photo EXIF location are never stored or shown.
  show_location boolean not null default false,
  status text not null default 'published',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  save_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  -- Lower-cased text used by search.
  search_text text generated always as (
    lower(title || ' ' || caption || ' ' || coalesce(city_label, '') || ' ' || coalesce(place_label, ''))
  ) stored,
  constraint community_posts_title_len check (char_length(title) between 3 and 120),
  constraint community_posts_caption_len check (char_length(caption) <= 2000),
  constraint community_posts_area_format check (area_id ~ '^[a-z]{2,30}$'),
  constraint community_posts_city_len check (char_length(city_label) <= 80),
  constraint community_posts_place_len check (char_length(place_label) <= 120),
  constraint community_posts_place_ref_format check (place_ref ~ '^Q[0-9]{1,12}$'),
  constraint community_posts_status check (status in ('pending', 'published', 'hidden', 'rejected')),
  constraint community_posts_counts check (like_count >= 0 and comment_count >= 0 and save_count >= 0)
);

create index if not exists community_posts_feed_idx on public.community_posts (status, published_at desc);
create index if not exists community_posts_area_idx on public.community_posts (area_id, status, published_at desc);
create index if not exists community_posts_category_idx on public.community_posts (category_slug, status, published_at desc);
create index if not exists community_posts_liked_idx on public.community_posts (status, like_count desc, published_at desc);
create index if not exists community_posts_user_idx on public.community_posts (user_id, created_at desc);
create index if not exists community_posts_place_idx on public.community_posts (place_ref) where place_ref is not null;

create extension if not exists pg_trgm with schema extensions;
create index if not exists community_posts_search_idx
  on public.community_posts using gin (search_text extensions.gin_trgm_ops);

alter table public.community_posts enable row level security;

-- Readers see published posts; authors also see their own (pending, hidden...);
-- moderators see everything.
drop policy if exists "Read published posts" on public.community_posts;
create policy "Read published posts" on public.community_posts
  for select using (status = 'published' or auth.uid() = user_id or public.is_moderator());

drop policy if exists "Create own posts" on public.community_posts;
create policy "Create own posts" on public.community_posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "Edit own posts or moderate" on public.community_posts;
create policy "Edit own posts or moderate" on public.community_posts
  for update using (auth.uid() = user_id or public.is_moderator())
  with check (auth.uid() = user_id or public.is_moderator());

drop policy if exists "Delete own posts or moderate" on public.community_posts;
create policy "Delete own posts or moderate" on public.community_posts
  for delete using (auth.uid() = user_id or public.is_moderator());

-- New posts: whatever the browser sends, the server decides the status and
-- starts the counters at zero, and a person can only post so fast.
-- (auth.uid() is null in the SQL editor / service role, which skips these limits.)
create or replace function public.community_posts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.community_settings;
  recent integer;
begin
  if auth.uid() is not null and not public.is_moderator() then
    select * into s from public.community_settings where id;

    select count(*) into recent
    from public.community_posts
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= coalesce(s.max_posts_per_hour, 10) then
      raise exception 'You are posting too quickly. Please wait a little and try again.' using errcode = 'P0001';
    end if;

    new.status := case when coalesce(s.require_approval, false) then 'pending' else 'published' end;
    new.like_count := 0;
    new.comment_count := 0;
    new.save_count := 0;
  end if;

  if new.visit_date is not null and new.visit_date > current_date + 1 then
    raise exception 'The visit date cannot be in the future.' using errcode = 'P0001';
  end if;

  new.created_at := now();
  new.updated_at := now();
  new.published_at := case when new.status = 'published' then now() else null end;
  return new;
end;
$$;

drop trigger if exists community_posts_before_insert on public.community_posts;
create trigger community_posts_before_insert
  before insert on public.community_posts
  for each row execute function public.community_posts_before_insert();

-- Edits: an author can change the words, photos' details and place, but never
-- the owner, the status, the counters or the dates that rank the post.
create or replace function public.community_posts_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_moderator() then
    new.user_id := old.user_id;
    new.status := old.status;
    new.like_count := old.like_count;
    new.comment_count := old.comment_count;
    new.save_count := old.save_count;
    new.created_at := old.created_at;
    new.published_at := old.published_at;
  elsif new.status is distinct from old.status then
    new.published_at := case when new.status = 'published' then coalesce(old.published_at, now()) else old.published_at end;
  end if;

  if new.visit_date is not null and new.visit_date > current_date + 1 then
    raise exception 'The visit date cannot be in the future.' using errcode = 'P0001';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists community_posts_before_update on public.community_posts;
create trigger community_posts_before_update
  before update on public.community_posts
  for each row execute function public.community_posts_before_update();

-- ───────────────────────── post images ─────────────────────────

create table if not exists public.community_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  storage_path text not null,   -- path inside the 'community-photos' bucket (phase 2)
  thumb_path text,
  width integer,
  height integer,
  alt text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint community_post_images_position check (position between 0 and 11),
  constraint community_post_images_size check ((width is null or width between 1 and 10000) and (height is null or height between 1 and 10000)),
  constraint community_post_images_alt_len check (char_length(alt) <= 200),
  unique (post_id, position)
);

create index if not exists community_post_images_post_idx on public.community_post_images (post_id, position);

alter table public.community_post_images enable row level security;

drop policy if exists "Read images of visible posts" on public.community_post_images;
create policy "Read images of visible posts" on public.community_post_images
  for select using (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id
        and (p.status = 'published' or p.user_id = auth.uid() or public.is_moderator())
    )
  );

drop policy if exists "Add images to own posts" on public.community_post_images;
create policy "Add images to own posts" on public.community_post_images
  for insert with check (
    exists (select 1 from public.community_posts p where p.id = post_id and p.user_id = auth.uid())
  );

drop policy if exists "Remove images from own posts or moderate" on public.community_post_images;
create policy "Remove images from own posts or moderate" on public.community_post_images
  for delete using (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id and (p.user_id = auth.uid() or public.is_moderator())
    )
  );

-- ───────────────────────── after running ─────────────────────────
-- Make yourself a moderator (replace the email with your own account's):
--
--   insert into public.moderators (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
--
-- Require approval before new posts appear (off by default):
--
--   update public.community_settings set require_approval = true where id;
