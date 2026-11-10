-- LIVE CITY JAPAN — Community, phase 3: place reviews and ratings.
--
-- Run AFTER 0003 and 0004, in the Supabase SQL editor. Safe to run more than once.
--
-- Adds:
--   community_reviews          one review per person per place: 1-5 stars, optional words,
--                              "would you recommend it?", optional visit date
--   community_review_images    up to 4 photos per review (files are in the same Storage bucket)
--   community_review_helpful   "this review was helpful" votes (separate from stars and likes)
--   community_review_stats()   the numbers shown on a place: average, count, 1-5 spread, recommended
--
-- Places are the Explore catalogue's places (Wikidata ids such as 'Q29682'); the website checks
-- the id against the catalogue before saving a review.
--
-- Fairness built into the database:
--   * UNIQUE (user_id, place_ref): nobody can review the same place twice.
--   * You cannot mark your own review helpful, and cannot vote twice.
--   * Status, helpful counts, authorship and dates cannot be changed by the review's author.
--   * At most 10 new reviews per person per hour.

-- ───────────────────────── reviews ─────────────────────────

create table if not exists public.community_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_ref text not null,
  area_id text not null,                 -- the place's prefecture, set by the website from the catalogue
  rating smallint not null,
  body text not null default '',
  recommend boolean not null,            -- "I would recommend this place" — separate from the stars
  visit_date date,
  status text not null default 'published',
  helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint community_reviews_place_ref check (place_ref ~ '^Q[0-9]{1,12}$'),
  constraint community_reviews_area_format check (area_id ~ '^[a-z]{2,30}$'),
  constraint community_reviews_rating check (rating between 1 and 5),
  constraint community_reviews_body_len check (char_length(body) <= 2000),
  constraint community_reviews_status check (status in ('pending', 'published', 'hidden', 'rejected')),
  constraint community_reviews_helpful check (helpful_count >= 0),
  unique (user_id, place_ref)
);

create index if not exists community_reviews_place_idx on public.community_reviews (place_ref, status, published_at desc);
create index if not exists community_reviews_place_rating_idx on public.community_reviews (place_ref, status, rating);
create index if not exists community_reviews_place_helpful_idx on public.community_reviews (place_ref, status, helpful_count desc);
create index if not exists community_reviews_user_idx on public.community_reviews (user_id, created_at desc);
create index if not exists community_reviews_area_idx on public.community_reviews (area_id, status);

alter table public.community_reviews enable row level security;

drop policy if exists "Read published reviews" on public.community_reviews;
create policy "Read published reviews" on public.community_reviews
  for select using (status = 'published' or auth.uid() = user_id or public.is_moderator());

drop policy if exists "Write own reviews" on public.community_reviews;
create policy "Write own reviews" on public.community_reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists "Edit own reviews or moderate" on public.community_reviews;
create policy "Edit own reviews or moderate" on public.community_reviews
  for update using (auth.uid() = user_id or public.is_moderator())
  with check (auth.uid() = user_id or public.is_moderator());

drop policy if exists "Delete own reviews or moderate" on public.community_reviews;
create policy "Delete own reviews or moderate" on public.community_reviews
  for delete using (auth.uid() = user_id or public.is_moderator());

create or replace function public.community_reviews_before_insert()
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

    select count(*) into recent from public.community_reviews
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= 10 then
      raise exception 'You are posting too quickly. Please wait a little and try again.' using errcode = 'P0001';
    end if;

    new.status := case when coalesce(s.require_approval, false) then 'pending' else 'published' end;
    new.helpful_count := 0;
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

drop trigger if exists community_reviews_before_insert on public.community_reviews;
create trigger community_reviews_before_insert
  before insert on public.community_reviews
  for each row execute function public.community_reviews_before_insert();

-- Edits: the author may change the stars, the words, the recommendation and the
-- visit date — nothing else. (The 'community.counters' switch lets only the
-- helpful-vote trigger below change the helpful count.)
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

drop trigger if exists community_reviews_before_update on public.community_reviews;
create trigger community_reviews_before_update
  before update on public.community_reviews
  for each row execute function public.community_reviews_before_update();

-- ───────────────────────── review photos ─────────────────────────

create table if not exists public.community_review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.community_reviews(id) on delete cascade,
  storage_path text not null,
  thumb_path text,
  width integer,
  height integer,
  alt text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint community_review_images_position check (position between 0 and 3),
  constraint community_review_images_size check ((width is null or width between 1 and 10000) and (height is null or height between 1 and 10000)),
  constraint community_review_images_alt_len check (char_length(alt) <= 200),
  unique (review_id, position)
);

create index if not exists community_review_images_review_idx on public.community_review_images (review_id, position);

alter table public.community_review_images enable row level security;

drop policy if exists "Read photos of visible reviews" on public.community_review_images;
create policy "Read photos of visible reviews" on public.community_review_images
  for select using (
    exists (
      select 1 from public.community_reviews r
      where r.id = review_id and (r.status = 'published' or r.user_id = auth.uid() or public.is_moderator())
    )
  );

drop policy if exists "Add photos to own reviews" on public.community_review_images;
create policy "Add photos to own reviews" on public.community_review_images
  for insert with check (
    exists (
      select 1 from public.community_reviews r
      where r.id = review_id
        and r.user_id = auth.uid()
        and storage_path like r.user_id::text || '/%'
        and (thumb_path is null or thumb_path like r.user_id::text || '/%')
    )
  );

drop policy if exists "Remove photos from own reviews or moderate" on public.community_review_images;
create policy "Remove photos from own reviews or moderate" on public.community_review_images
  for delete using (
    exists (
      select 1 from public.community_reviews r
      where r.id = review_id and (r.user_id = auth.uid() or public.is_moderator())
    )
  );

create or replace function public.community_review_images_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  have integer;
begin
  select count(*) into have from public.community_review_images where review_id = new.review_id;
  if have >= 4 then
    raise exception 'A review can have at most 4 photos.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists community_review_images_before_insert on public.community_review_images;
create trigger community_review_images_before_insert
  before insert on public.community_review_images
  for each row execute function public.community_review_images_before_insert();

-- The upload log can now attach a photo to a review as well as to a post (never both).
alter table public.community_uploads add column if not exists review_id uuid references public.community_reviews(id) on delete set null;
alter table public.community_uploads drop constraint if exists community_uploads_one_target;
alter table public.community_uploads add constraint community_uploads_one_target check (post_id is null or review_id is null);

create or replace function public.community_uploads_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_moderator() then
      select count(*) into recent from public.community_uploads
      where user_id = auth.uid() and created_at > now() - interval '1 hour';
      if recent >= 60 then
        raise exception 'You are uploading too quickly. Please wait a little and try again.' using errcode = 'P0001';
      end if;
    end if;
    new.post_id := null;
    new.review_id := null;
    new.created_at := now();
  else
    new.user_id := old.user_id;
    new.path := old.path;
    new.thumb_path := old.thumb_path;
    new.width := old.width;
    new.height := old.height;
    new.created_at := old.created_at;
    if new.post_id is not null and not exists (
      select 1 from public.community_posts p where p.id = new.post_id and p.user_id = new.user_id
    ) then
      raise exception 'That post is not yours.' using errcode = 'P0001';
    end if;
    if new.review_id is not null and not exists (
      select 1 from public.community_reviews r where r.id = new.review_id and r.user_id = new.user_id
    ) then
      raise exception 'That review is not yours.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- ───────────────────────── helpful votes ─────────────────────────

create table if not exists public.community_review_helpful (
  review_id uuid not null references public.community_reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
create index if not exists community_review_helpful_user_idx on public.community_review_helpful (user_id, created_at desc);

alter table public.community_review_helpful enable row level security;

drop policy if exists "See own helpful votes" on public.community_review_helpful;
create policy "See own helpful votes" on public.community_review_helpful for select using (auth.uid() = user_id);

-- Only on someone else's published review, and only as yourself.
drop policy if exists "Vote helpful as yourself" on public.community_review_helpful;
create policy "Vote helpful as yourself" on public.community_review_helpful
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.community_reviews r
      where r.id = review_id and r.status = 'published' and r.user_id <> auth.uid()
    )
  );

drop policy if exists "Remove own helpful vote" on public.community_review_helpful;
create policy "Remove own helpful vote" on public.community_review_helpful for delete using (auth.uid() = user_id);

create or replace function public.community_count_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  target uuid := case when tg_op = 'INSERT' then new.review_id else old.review_id end;
  recent integer;
begin
  if tg_op = 'INSERT' and auth.uid() is not null and not public.is_moderator() then
    select count(*) into recent from public.community_review_helpful
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent > 100 then
      raise exception 'You are doing that too quickly. Please wait a little.' using errcode = 'P0001';
    end if;
  end if;

  perform set_config('community.counters', 'on', true);
  update public.community_reviews set helpful_count = greatest(0, helpful_count + delta) where id = target;
  perform set_config('community.counters', '', true);
  return null;
end;
$$;

drop trigger if exists community_helpful_counter on public.community_review_helpful;
create trigger community_helpful_counter
  after insert or delete on public.community_review_helpful
  for each row execute function public.community_count_helpful();

-- ───────────────────────── rating statistics ─────────────────────────

-- The numbers for one place, computed from the published reviews that exist right
-- now — nothing is stored, estimated or padded. Runs as the caller, so Row Level
-- Security applies; the status filter keeps pending or hidden reviews out of it.
create or replace function public.community_review_stats(p_place_ref text)
returns table (review_count bigint, average numeric, r1 bigint, r2 bigint, r3 bigint, r4 bigint, r5 bigint, recommend_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*),
    round(avg(rating)::numeric, 2),
    count(*) filter (where rating = 1),
    count(*) filter (where rating = 2),
    count(*) filter (where rating = 3),
    count(*) filter (where rating = 4),
    count(*) filter (where rating = 5),
    count(*) filter (where recommend)
  from public.community_reviews
  where place_ref = p_place_ref and status = 'published';
$$;

grant execute on function public.community_review_stats(text) to anon, authenticated;

-- ───────────────────────── reports can now point at reviews ─────────────────────────

create or replace function public.community_reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if auth.uid() is not null and not public.is_moderator() then
    select count(*) into recent from public.community_reports
    where reporter_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= 20 then
      raise exception 'You are reporting too quickly. Please wait a little.' using errcode = 'P0001';
    end if;
  end if;
  if new.target_type = 'post' and not exists (select 1 from public.community_posts where id = new.target_id) then
    raise exception 'That post does not exist.' using errcode = 'P0001';
  end if;
  if new.target_type = 'review' and not exists (select 1 from public.community_reviews where id = new.target_id) then
    raise exception 'That review does not exist.' using errcode = 'P0001';
  end if;
  new.status := 'open';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.created_at := now();
  return new;
end;
$$;
