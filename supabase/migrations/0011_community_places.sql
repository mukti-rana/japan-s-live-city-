-- LIVE CITY JAPAN — Community: places from OpenStreetMap, and a place type on content.
--
-- Run AFTER 0003 … 0010, in the Supabase SQL editor. Safe to run more than once.
-- Nothing is dropped and no row is rewritten: existing posts, reviews, questions and
-- "been here" marks keep their Explore (Wikidata "Q…") place references untouched.
--
-- What this adds:
--   * community_places          restaurants, hotels, cafes, shops, gyms, salons and anything else
--                               a person picked from OpenStreetMap. Explore catalogue places
--                               are NOT copied here: they are read from the catalogue as before.
--   * place references may now also look like N123 / W123 / R123 (an OpenStreetMap node, way or
--     relation) as well as Q123 (an Explore place) — on posts, reviews, questions, "been here".
--   * place_name / place_category on content, so lists can show and filter by place type
--     (restaurant, cafe, hotel…) without looking every place up.
--
-- Honesty and safety:
--   * Nobody can write to community_places directly. Places are saved through
--     community_save_place(), which checks every value (inside Japan, known type, sane lengths),
--     needs a signed-in, not-suspended person and limits how many a person can add per hour.
--     The website additionally re-reads each place from OpenStreetMap before saving it.
--   * Only moderators can correct or remove a place.
--   * Nothing here ever holds a person's own location.

-- ───────────────────────── places ─────────────────────────

create table if not exists public.community_places (
  place_ref text primary key,                 -- N123 / W123 / R123 (OpenStreetMap)
  display_name text not null,                 -- the name shown (the place's own name)
  name_en text,
  name_ja text,
  address text,
  city text,
  area_id text not null,                      -- the prefecture id used across the site ('tokyo', 'osaka'…)
  lat double precision not null,
  lon double precision not null,
  category text not null,                     -- restaurant, cafe, hotel, shopping, department_store, gym, salon, attraction, other
  osm_class text,                             -- the OpenStreetMap tag it came from, e.g. amenity=restaurant
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint community_places_ref check (place_ref ~ '^[NWR][0-9]{1,15}$'),
  constraint community_places_area check (area_id ~ '^[a-z]{2,30}$'),
  constraint community_places_japan check (lat between 20 and 46.6 and lon between 122 and 154.5),
  constraint community_places_category check (category in ('attraction', 'restaurant', 'cafe', 'hotel', 'shopping', 'department_store', 'gym', 'salon', 'other')),
  constraint community_places_lengths check (
    char_length(display_name) between 1 and 150
    and (name_en is null or char_length(name_en) <= 150)
    and (name_ja is null or char_length(name_ja) <= 150)
    and (address is null or char_length(address) <= 300)
    and (city is null or char_length(city) <= 100)
    and (osm_class is null or char_length(osm_class) <= 60)
  )
);

create index if not exists community_places_area_idx on public.community_places (area_id, category);
create index if not exists community_places_category_idx on public.community_places (category);

alter table public.community_places enable row level security;

-- Places are public information.
drop policy if exists "Places are public" on public.community_places;
create policy "Places are public" on public.community_places for select using (true);

-- No insert policy for people: see community_save_place() below.
drop policy if exists "Moderators correct places" on public.community_places;
create policy "Moderators correct places" on public.community_places
  for update using (public.is_moderator()) with check (public.is_moderator());
drop policy if exists "Moderators remove places" on public.community_places;
create policy "Moderators remove places" on public.community_places
  for delete using (public.is_moderator());

create or replace function public.community_save_place(
  p_ref text,
  p_display_name text,
  p_name_en text,
  p_name_ja text,
  p_address text,
  p_city text,
  p_area_id text,
  p_lat double precision,
  p_lon double precision,
  p_category text,
  p_osm_class text
)
returns public.community_places
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.community_places;
  recent integer;
begin
  if auth.uid() is null then
    raise exception 'Please sign in.' using errcode = 'P0001';
  end if;
  if public.is_suspended() and not public.is_moderator() then
    raise exception 'Your account is suspended from posting in the community for now.' using errcode = 'P0001';
  end if;

  select * into saved from public.community_places where place_ref = p_ref;
  if found then
    return saved;
  end if;

  if not public.is_moderator() then
    select count(*) into recent from public.community_places where created_by = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= 30 then
      raise exception 'You are adding places too quickly. Please wait a little.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.community_places (place_ref, display_name, name_en, name_ja, address, city, area_id, lat, lon, category, osm_class, created_by)
  values (p_ref, trim(p_display_name), nullif(trim(p_name_en), ''), nullif(trim(p_name_ja), ''), nullif(trim(p_address), ''), nullif(trim(p_city), ''), p_area_id, p_lat, p_lon, p_category, nullif(trim(p_osm_class), ''), auth.uid())
  on conflict (place_ref) do nothing;

  select * into saved from public.community_places where place_ref = p_ref;
  return saved;
end;
$$;

revoke execute on function public.community_save_place(text, text, text, text, text, text, text, double precision, double precision, text, text) from public, anon;
grant execute on function public.community_save_place(text, text, text, text, text, text, text, double precision, double precision, text, text) to authenticated;

-- ───────────────────────── place references: also OpenStreetMap places ─────────────────────────

alter table public.community_posts drop constraint if exists community_posts_place_ref_format;
alter table public.community_posts add constraint community_posts_place_ref_format check (place_ref ~ '^(Q[0-9]{1,12}|[NWR][0-9]{1,15})$');

alter table public.community_reviews drop constraint if exists community_reviews_place_ref;
alter table public.community_reviews add constraint community_reviews_place_ref check (place_ref ~ '^(Q[0-9]{1,12}|[NWR][0-9]{1,15})$');

alter table public.community_questions drop constraint if exists community_questions_place_ref;
alter table public.community_questions add constraint community_questions_place_ref check (place_ref ~ '^(Q[0-9]{1,12}|[NWR][0-9]{1,15})$');

alter table public.community_visited drop constraint if exists community_visited_place_ref;
alter table public.community_visited add constraint community_visited_place_ref check (place_ref ~ '^(Q[0-9]{1,12}|[NWR][0-9]{1,15})$');

-- ───────────────────────── place type and name on content ─────────────────────────

alter table public.community_posts add column if not exists place_category text;
alter table public.community_reviews add column if not exists place_name text;
alter table public.community_reviews add column if not exists place_category text;
alter table public.community_questions add column if not exists place_name text;
alter table public.community_questions add column if not exists place_category text;

alter table public.community_posts drop constraint if exists community_posts_place_category;
alter table public.community_posts add constraint community_posts_place_category check (place_category is null or place_category in ('attraction', 'restaurant', 'cafe', 'hotel', 'shopping', 'department_store', 'gym', 'salon', 'other'));
alter table public.community_reviews drop constraint if exists community_reviews_place_category;
alter table public.community_reviews add constraint community_reviews_place_category check (place_category is null or place_category in ('attraction', 'restaurant', 'cafe', 'hotel', 'shopping', 'department_store', 'gym', 'salon', 'other'));
alter table public.community_questions drop constraint if exists community_questions_place_category;
alter table public.community_questions add constraint community_questions_place_category check (place_category is null or place_category in ('attraction', 'restaurant', 'cafe', 'hotel', 'shopping', 'department_store', 'gym', 'salon', 'other'));

alter table public.community_reviews drop constraint if exists community_reviews_place_name_len;
alter table public.community_reviews add constraint community_reviews_place_name_len check (place_name is null or char_length(place_name) <= 150);
alter table public.community_questions drop constraint if exists community_questions_place_name_len;
alter table public.community_questions add constraint community_questions_place_name_len check (place_name is null or char_length(place_name) <= 150);

create index if not exists community_posts_place_category_idx on public.community_posts (place_category, status, published_at desc) where place_category is not null;
create index if not exists community_reviews_place_category_idx on public.community_reviews (place_category, status, published_at desc) where place_category is not null;
create index if not exists community_questions_place_category_idx on public.community_questions (place_category, status, published_at desc) where place_category is not null;

-- ───────────────────────── keep the place on a review / question fixed ─────────────────────────

-- Same rules as before (see 0005 and 0006), plus: the author cannot change the stored place
-- name or type of their own review or question afterwards.
create or replace function public.community_reviews_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  counting boolean := coalesce(current_setting('community.counters', true), '') = 'on';
begin
  if auth.uid() is not null and not public.is_moderator() then
    new.user_id := old.user_id;
    new.place_ref := old.place_ref;
    new.place_name := old.place_name;
    new.place_category := old.place_category;
    new.area_id := old.area_id;
    new.status := old.status;
    new.created_at := old.created_at;
    new.published_at := old.published_at;
    if not counting then
      new.helpful_count := old.helpful_count;
    end if;
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

create or replace function public.community_questions_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  counting boolean := coalesce(current_setting('community.counters', true), '') = 'on';
begin
  if auth.uid() is not null and not public.is_moderator() then
    new.user_id := old.user_id;
    new.area_id := old.area_id;
    new.place_ref := old.place_ref;
    new.place_name := old.place_name;
    new.place_category := old.place_category;
    new.status := old.status;
    new.created_at := old.created_at;
    new.published_at := old.published_at;
    if not counting then
      new.answer_count := old.answer_count;
      new.helpful_count := old.helpful_count;
    end if;
  elsif new.status is distinct from old.status then
    new.published_at := case when new.status = 'published' then coalesce(old.published_at, now()) else old.published_at end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Trigger functions are never called over the API.
revoke execute on function public.community_reviews_before_update() from public, anon, authenticated;
revoke execute on function public.community_questions_before_update() from public, anon, authenticated;
