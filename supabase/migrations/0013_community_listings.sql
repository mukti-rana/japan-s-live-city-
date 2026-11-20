-- LIVE CITY JAPAN — Community, phase 7: What's Happening, part 1 (publishing and discovery).
--
-- Run AFTER 0003 … 0012, in the Supabase SQL editor. Safe to run more than once; it only creates what is
-- missing and never drops or rewrites existing content. To undo it, run rollback/0013_down.sql.
--
-- What this adds:
--   * community_listing_categories   the event categories (Concerts & Music, Festivals & Matsuri, ...)
--   * community_listings             ONE table for everything people publish about what is happening:
--                                    an event, an announcement, a business promotion or a community
--                                    activity (the `kind` column), each with a status:
--                                    draft | pending | published | rejected | hidden | expired | cancelled
--   * community_listing_media        its photographs (stored through the existing upload step, in the
--                                    existing 'community-photos' bucket) and an optional video LINK
--                                    (YouTube or Vimeo; no video files are stored)
--   * community_listing_screen()     the automated safety checks (spam, suspicious links, prohibited
--                                    content, shouting, repeated characters), run by the database so
--                                    that no request can skip them
--   * community_listing_submit()     "Publish": checks the required fields, the hourly limit and
--                                    duplicates, screens the text, then publishes at once or holds
--                                    the listing for a moderator
--   * community_listing_set_state()  the organizer's own cancel / resume / withdraw
--   * community_expire_listings()    marks finished listings as expired (the site also works this out
--                                    from the dates when it shows them, so this is only tidying)
--   * reports and the moderation log can now point at a listing
--
-- It reuses what already exists: profiles, moderators / is_moderator(), suspensions, community_settings,
-- the upload log and photo bucket, reports and the moderation log. It does not touch the homepage's
-- data, and nothing here uses a service-role key.
--
-- Security model (the same as the rest of the Community):
--   * Everything has Row Level Security on.
--   * Anyone can read PUBLISHED, CANCELLED and EXPIRED listings (a cancelled event stays visible, marked
--     as cancelled); the author also sees their own drafts, held and rejected ones; moderators see all.
--   * A new listing always starts as a draft, whatever the browser sends. Status, the featured and
--     sponsored marks, the counters and the owner can only be changed by the database's own functions
--     (or by a moderator); an author can edit the words, but an edit to a published listing that fails
--     the checks sends it back to review.

-- ───────────────────────── settings ─────────────────────────

alter table public.community_settings
  add column if not exists listings_require_approval boolean not null default false,   -- true: every submission waits for a moderator
  add column if not exists max_listings_per_hour integer not null default 6,
  add column if not exists max_listing_images integer not null default 10;

-- ───────────────────────── categories ─────────────────────────

create table if not exists public.community_listing_categories (
  slug text primary key,
  name_en text not null,
  name_ja text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  constraint community_listing_categories_slug_format check (slug ~ '^[a-z0-9-]{2,40}$')
);

alter table public.community_listing_categories enable row level security;

drop policy if exists "Listing categories are public" on public.community_listing_categories;
create policy "Listing categories are public" on public.community_listing_categories
  for select using (is_active or public.is_moderator());

drop policy if exists "Moderators manage listing categories" on public.community_listing_categories;
create policy "Moderators manage listing categories" on public.community_listing_categories
  for all using (public.is_moderator()) with check (public.is_moderator());

insert into public.community_listing_categories (slug, name_en, name_ja, sort_order) values
  ('concerts-music', 'Concerts & Music', 'コンサート・音楽', 1),
  ('festivals-matsuri', 'Festivals & Matsuri', '祭り・フェスティバル', 2),
  ('fireworks', 'Fireworks', '花火', 3),
  ('food-markets', 'Food & Markets', 'グルメ・マーケット', 4),
  ('exhibitions-art', 'Exhibitions & Art', '展覧会・アート', 5),
  ('workshops-classes', 'Workshops & Classes', 'ワークショップ・教室', 6),
  ('sports', 'Sports', 'スポーツ', 7),
  ('school-university', 'School & University Events', '学校・大学のイベント', 8),
  ('community-meetups', 'Community Meetups', '交流会・ミートアップ', 9),
  ('business-promotions', 'Business Promotions', 'お店・ビジネスのプロモーション', 10),
  ('seasonal-activities', 'Seasonal Activities', '季節のアクティビティ', 11),
  ('local-announcements', 'Local Announcements', '地域のお知らせ', 12),
  ('other', 'Other', 'その他', 13)
on conflict (slug) do nothing;

-- ───────────────────────── listings ─────────────────────────

create table if not exists public.community_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  status text not null default 'draft',
  title text not null,
  summary text not null default '',          -- the short description (cards and previews)
  description text not null default '',      -- the full description
  category_slug text not null default 'other' references public.community_listing_categories(slug),

  -- Where. The prefecture id used across the site ('osaka', 'tokyo', ...); the app checks it against the real list.
  area_id text,
  city_label text,
  venue_name text,
  address text,
  lat double precision,
  lon double precision,

  -- When. Dates are stored as exact moments; the site shows them in Japan time.
  starts_at timestamptz,
  ends_at timestamptz,                        -- for an announcement or promotion, the day it expires
  all_day boolean not null default false,
  recurrence text not null default 'none',   -- none | daily | weekly | monthly
  recurrence_until date,

  -- Entry. Free or paid, with or without registration.
  registration_required boolean not null default false,
  is_free boolean not null default true,
  price_text text,                            -- "¥1,500", "¥800 – ¥2,000", "Donation"
  ticket_url text,
  registration_url text,                      -- for a promotion, its booking link
  website_url text,
  social_url text,

  -- Who, and for what.
  organizer_name text,
  organizer_contact text,
  business_name text,                         -- promotions
  offer_details text,                         -- promotions
  terms text,                                 -- promotions
  age_restriction text,
  accessibility text,
  instructions text,

  -- Organizer controls. `postponed` and `schedule_note` show a notice such as "Postponed: new date to be announced".
  inquiries_enabled boolean not null default true,
  postponed boolean not null default false,
  schedule_note text,

  -- Only a moderator can change these.
  featured boolean not null default false,
  sponsored boolean not null default false,
  hold_reason text,                           -- why the automated checks held it for review

  -- Counters (kept by the database; filled in by the interaction features that follow).
  interested_count integer not null default 0,
  going_count integer not null default 0,
  save_count integer not null default 0,
  question_count integer not null default 0,

  client_key text,                            -- stops a double click or a retry from publishing twice
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  published_at timestamptz,

  search_text text generated always as (
    lower(title || ' ' || summary || ' ' || description || ' ' || coalesce(city_label, '') || ' ' || coalesce(venue_name, '') || ' ' || coalesce(organizer_name, '') || ' ' || coalesce(business_name, ''))
  ) stored,

  constraint community_listings_kind check (kind in ('event', 'announcement', 'promotion', 'activity')),
  constraint community_listings_status check (status in ('draft', 'pending', 'published', 'rejected', 'hidden', 'expired', 'cancelled')),
  constraint community_listings_title_len check (char_length(title) between 1 and 120),
  constraint community_listings_summary_len check (char_length(summary) <= 240),
  constraint community_listings_description_len check (char_length(description) <= 5000),
  constraint community_listings_area_format check (area_id ~ '^[a-z]{2,30}$'),
  constraint community_listings_city_len check (char_length(city_label) <= 80),
  constraint community_listings_venue_len check (char_length(venue_name) <= 120),
  constraint community_listings_address_len check (char_length(address) <= 200),
  constraint community_listings_lat check (lat between 20 and 47),
  constraint community_listings_lon check (lon between 122 and 154),
  constraint community_listings_place_pair check ((lat is null) = (lon is null)),
  constraint community_listings_dates check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint community_listings_recurrence check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  constraint community_listings_price_len check (char_length(price_text) <= 80),
  constraint community_listings_ticket_url check (ticket_url ~ '^https://[^[:space:]]+$' and char_length(ticket_url) <= 300),
  constraint community_listings_registration_url check (registration_url ~ '^https://[^[:space:]]+$' and char_length(registration_url) <= 300),
  constraint community_listings_website_url check (website_url ~ '^https://[^[:space:]]+$' and char_length(website_url) <= 300),
  constraint community_listings_social_url check (social_url ~ '^https://[^[:space:]]+$' and char_length(social_url) <= 300),
  constraint community_listings_organizer_len check (char_length(organizer_name) <= 100 and char_length(organizer_contact) <= 160 and char_length(business_name) <= 100),
  constraint community_listings_texts_len check (char_length(offer_details) <= 1500 and char_length(terms) <= 1500 and char_length(age_restriction) <= 100 and char_length(accessibility) <= 600 and char_length(instructions) <= 1200),
  constraint community_listings_note_len check (char_length(schedule_note) <= 300 and char_length(hold_reason) <= 300),
  constraint community_listings_counts check (interested_count >= 0 and going_count >= 0 and save_count >= 0 and question_count >= 0),
  -- Anything submitted (not a draft) is complete enough to show.
  constraint community_listings_complete check (status = 'draft' or (char_length(btrim(title)) >= 5 and (btrim(summary) <> '' or btrim(description) <> '')))
);

create index if not exists community_listings_public_idx on public.community_listings (status, starts_at);
create index if not exists community_listings_published_idx on public.community_listings (status, published_at desc);
create index if not exists community_listings_kind_idx on public.community_listings (kind, status, starts_at);
create index if not exists community_listings_area_idx on public.community_listings (area_id, status, starts_at);
create index if not exists community_listings_category_idx on public.community_listings (category_slug, status, starts_at);
create index if not exists community_listings_featured_idx on public.community_listings (featured, status, starts_at) where featured;
create index if not exists community_listings_user_idx on public.community_listings (user_id, created_at desc);
create unique index if not exists community_listings_client_key_idx on public.community_listings (user_id, client_key) where client_key is not null;
create index if not exists community_listings_search_idx on public.community_listings using gin (search_text extensions.gin_trgm_ops);

alter table public.community_listings enable row level security;

-- Readers see published, cancelled and expired listings; authors also see their own (drafts, held, rejected, hidden); moderators see everything.
drop policy if exists "Read public listings" on public.community_listings;
create policy "Read public listings" on public.community_listings
  for select using (status in ('published', 'cancelled', 'expired') or auth.uid() = user_id or public.is_moderator());

drop policy if exists "Create own listings" on public.community_listings;
create policy "Create own listings" on public.community_listings
  for insert with check (auth.uid() = user_id);

drop policy if exists "Edit own listings or moderate" on public.community_listings;
create policy "Edit own listings or moderate" on public.community_listings
  for update using (auth.uid() = user_id or public.is_moderator())
  with check (auth.uid() = user_id or public.is_moderator());

-- An author may remove their own listing unless a moderator is looking at it (held or hidden); moderators may remove any.
drop policy if exists "Delete own listings or moderate" on public.community_listings;
create policy "Delete own listings or moderate" on public.community_listings
  for delete using ((auth.uid() = user_id and status not in ('pending', 'hidden')) or public.is_moderator());

-- ───────────────────────── automated checks ─────────────────────────

-- Returns why a text should be looked at by a person, or null when it passes. Deliberately plain and cautious: it holds things back
-- for review; it never rejects anything by itself.
create or replace function public.community_listing_screen(p_title text, p_text text, p_urls text[])
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  t text := lower(coalesce(p_text, ''));
  n integer;
  letters integer;
  capitals integer;
  title_letters integer;
  title_capitals integer;
  u text;
  host text;
begin
  select count(*) into n from regexp_matches(t, 'https?://|www\.', 'g');
  if n > 3 then return 'The text contains many links.'; end if;

  if t ~ '(^|[^a-z0-9.-])(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|ow\.ly|cutt\.ly|rebrand\.ly|shorturl\.at|buff\.ly|t\.ly|rb\.gy)(/|$|[^a-z0-9.-])' then
    return 'The text contains a shortened link.';
  end if;

  if t ~ '\m(casino|porn|porno|escort service|viagra|cialis|adult video|sex chat|crypto giveaway|bitcoin giveaway|click here to win|free money|loan shark)\M' then
    return 'The text may contain prohibited content.';
  end if;

  letters := char_length(regexp_replace(coalesce(p_text, ''), '[^A-Za-z]', '', 'g'));
  capitals := char_length(regexp_replace(coalesce(p_text, ''), '[^A-Z]', '', 'g'));
  if letters >= 20 and capitals::numeric / letters > 0.7 then return 'The text is mostly capital letters.'; end if;
  -- a shouted title is judged on its own, so a normal description beside it cannot hide it
  title_letters := char_length(regexp_replace(coalesce(p_title, ''), '[^A-Za-z]', '', 'g'));
  title_capitals := char_length(regexp_replace(coalesce(p_title, ''), '[^A-Z]', '', 'g'));
  if title_letters >= 12 and title_capitals::numeric / title_letters > 0.7 then return 'The title is mostly capital letters.'; end if;

  if t ~ '(.)\1{9,}' then return 'The text repeats the same character many times.'; end if;

  foreach u in array coalesce(p_urls, array[]::text[]) loop
    if u is null or u = '' then continue; end if;
    host := lower(substring(u from '^https://([^/:?#]+)'));
    if host is null
       or host ~ '^[0-9.]+$'                       -- a bare IP address
       or host !~ '\.'                             -- no dot: not a normal site
       or host like '%xn--%'                       -- look-alike (punycode) address
       or host ~ '(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|ow\.ly|cutt\.ly|rebrand\.ly|shorturl\.at|buff\.ly|t\.ly|rb\.gy)$' then
      return 'A link looks suspicious.';
    end if;
  end loop;

  return null;
end;
$$;

revoke all on function public.community_listing_screen(text, text, text[]) from public, anon, authenticated;

-- ───────────────────────── before insert / update ─────────────────────────

create or replace function public.community_listings_before_insert()
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
    select count(*) into recent from public.community_listings
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= greatest(coalesce(s.max_listings_per_hour, 6) * 3, 15) then
      raise exception 'You are creating drafts too quickly. Please wait a little and try again.' using errcode = 'P0001';
    end if;

    -- Whatever the browser sends: it starts as a private draft, unmarked, with the counters at zero.
    new.status := 'draft';
    new.featured := false;
    new.sponsored := false;
    new.hold_reason := null;
    new.submitted_at := null;
    new.published_at := null;
    new.interested_count := 0;
    new.going_count := 0;
    new.save_count := 0;
    new.question_count := 0;
  end if;

  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists community_listings_before_insert on public.community_listings;
create trigger community_listings_before_insert
  before insert on public.community_listings
  for each row execute function public.community_listings_before_insert();

-- Edits: an author can change the words and details, never the owner, the kind, the status, the marks or the counters. Those change only
-- through the functions below (they set a flag for the length of their own transaction) or by a moderator.
create or replace function public.community_listings_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  via_function boolean := coalesce(current_setting('community.listing_rpc', true), '') = '1';
  reason text;
begin
  if auth.uid() is not null and not public.is_moderator() then
    new.user_id := old.user_id;
    new.kind := old.kind;
    new.featured := old.featured;
    new.sponsored := old.sponsored;
    new.interested_count := old.interested_count;
    new.going_count := old.going_count;
    new.save_count := old.save_count;
    new.question_count := old.question_count;
    new.created_at := old.created_at;
    new.client_key := old.client_key;
    if not via_function then
      new.status := old.status;
      new.hold_reason := old.hold_reason;
      new.submitted_at := old.submitted_at;
      new.published_at := old.published_at;

      -- Changing the words of a published listing runs the checks again; if they now fail, it goes back to review.
      if old.status = 'published'
         and (new.title, new.summary, new.description, new.offer_details, new.terms, new.instructions, new.organizer_name, new.business_name, new.ticket_url, new.registration_url, new.website_url, new.social_url)
             is distinct from
             (old.title, old.summary, old.description, old.offer_details, old.terms, old.instructions, old.organizer_name, old.business_name, old.ticket_url, old.registration_url, old.website_url, old.social_url) then
        reason := public.community_listing_screen(
          new.title,
          concat_ws(E'\n', new.title, new.summary, new.description, new.offer_details, new.terms, new.instructions, new.organizer_name, new.business_name),
          array[new.ticket_url, new.registration_url, new.website_url, new.social_url]);
        if reason is not null then
          new.status := 'pending';
          new.hold_reason := reason;
        end if;
      end if;
    end if;
  elsif new.status is distinct from old.status then
    -- A moderator's change: publishing stamps the date once.
    new.published_at := case when new.status = 'published' then coalesce(old.published_at, now()) else old.published_at end;
    if new.status = 'published' then new.hold_reason := null; end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists community_listings_before_update on public.community_listings;
create trigger community_listings_before_update
  before update on public.community_listings
  for each row execute function public.community_listings_before_update();

-- A suspended account cannot create listings (the same check the rest of the Community uses).
drop trigger if exists a_community_block_suspended on public.community_listings;
create trigger a_community_block_suspended
  before insert on public.community_listings
  for each row execute function public.community_block_suspended();

-- ───────────────────────── publish, cancel, resume, withdraw ─────────────────────────

-- "Publish": the one way a listing leaves draft. Returns the resulting status ('published' or 'pending').
create or replace function public.community_listing_submit(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.community_listings;
  s public.community_settings;
  recent integer;
  reason text;
  result text;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to publish.' using errcode = 'P0001';
  end if;
  select * into l from public.community_listings where id = p_id;
  if not found or l.user_id <> auth.uid() then
    raise exception 'That publication could not be found.' using errcode = 'P0001';
  end if;
  if public.is_suspended() then
    raise exception 'Your account is suspended from posting in the community for now.' using errcode = 'P0001';
  end if;
  if l.status not in ('draft', 'rejected') then
    raise exception 'This has already been submitted.' using errcode = 'P0001';
  end if;

  -- Required information.
  if char_length(btrim(l.title)) < 5 then
    raise exception 'Give it a title of at least 5 characters.' using errcode = 'P0001';
  end if;
  if btrim(l.summary) = '' and btrim(l.description) = '' then
    raise exception 'Add a short description.' using errcode = 'P0001';
  end if;
  if l.kind in ('event', 'activity') and l.starts_at is null then
    raise exception 'Add when it starts.' using errcode = 'P0001';
  end if;
  if l.kind in ('event', 'activity', 'promotion') and l.area_id is null then
    raise exception 'Choose where in Japan it is.' using errcode = 'P0001';
  end if;
  if l.starts_at is not null and l.starts_at > now() + interval '2 years' then
    raise exception 'That date is too far ahead.' using errcode = 'P0001';
  end if;
  if l.kind in ('event', 'activity') and coalesce(l.ends_at, l.starts_at + interval '6 hours') < now() and l.recurrence = 'none' then
    raise exception 'That has already finished. Choose a date that has not passed.' using errcode = 'P0001';
  end if;
  if l.ends_at is not null and l.ends_at < now() and l.kind in ('announcement', 'promotion') then
    raise exception 'The expiry date has already passed.' using errcode = 'P0001';
  end if;
  if l.recurrence <> 'none' and (l.starts_at is null or l.recurrence_until is null or l.recurrence_until < (l.starts_at at time zone 'Asia/Tokyo')::date) then
    raise exception 'A repeating event needs an end date for the repeats.' using errcode = 'P0001';
  end if;
  if l.kind in ('event', 'activity') and not l.is_free and coalesce(btrim(l.price_text), '') = '' then
    raise exception 'Add the price, or mark the entry as free.' using errcode = 'P0001';
  end if;

  -- A person can only publish so fast.
  select * into s from public.community_settings where id;
  select count(*) into recent from public.community_listings
  where user_id = auth.uid() and submitted_at > now() - interval '1 hour';
  if recent >= coalesce(s.max_listings_per_hour, 6) and not public.is_moderator() then
    raise exception 'You are publishing too quickly. Please wait a little and try again.' using errcode = 'P0001';
  end if;

  -- The same thing from the same person within a day is a repeat.
  if exists (
    select 1 from public.community_listings o
    where o.user_id = l.user_id and o.id <> l.id and o.status <> 'draft'
      and lower(btrim(o.title)) = lower(btrim(l.title))
      and o.starts_at is not distinct from l.starts_at
      and o.submitted_at > now() - interval '24 hours'
  ) then
    raise exception 'You have already published this.' using errcode = 'P0001';
  end if;

  -- The automated checks. A hit holds it for a moderator.
  reason := public.community_listing_screen(
    l.title,
    concat_ws(E'\n', l.title, l.summary, l.description, l.offer_details, l.terms, l.instructions, l.organizer_name, l.business_name),
    array[l.ticket_url, l.registration_url, l.website_url, l.social_url]);

  -- Someone else already listed the same title, in the same prefecture, on the same day: look before showing both.
  if reason is null and l.starts_at is not null and exists (
    select 1 from public.community_listings o
    where o.user_id <> l.user_id and o.status in ('published', 'pending')
      and lower(btrim(o.title)) = lower(btrim(l.title))
      and o.area_id is not distinct from l.area_id
      and (o.starts_at at time zone 'Asia/Tokyo')::date = (l.starts_at at time zone 'Asia/Tokyo')::date
  ) then
    reason := 'Possible duplicate of an existing listing.';
  end if;

  if reason is null and coalesce(s.listings_require_approval, false) then
    reason := 'All new publications are being reviewed before they appear.';
  end if;

  result := case when reason is null then 'published' else 'pending' end;
  perform set_config('community.listing_rpc', '1', true);
  update public.community_listings
  set status = result,
      hold_reason = reason,
      submitted_at = now(),
      published_at = case when result = 'published' then coalesce(published_at, now()) else published_at end
  where id = l.id;
  perform set_config('community.listing_rpc', '', true);
  return result;
end;
$$;

-- The organizer's own controls: 'cancel' a published listing (it stays visible, marked as cancelled), 'resume' a cancelled one,
-- 'withdraw' a published or held one back to a private draft. Postponing is an edit: `postponed` and `schedule_note`.
create or replace function public.community_listing_set_state(p_id uuid, p_action text, p_note text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.community_listings;
  next_status text;
begin
  if auth.uid() is null then
    raise exception 'Please sign in.' using errcode = 'P0001';
  end if;
  select * into l from public.community_listings where id = p_id;
  if not found or l.user_id <> auth.uid() then
    raise exception 'That publication could not be found.' using errcode = 'P0001';
  end if;

  if p_action = 'cancel' and l.status = 'published' then
    next_status := 'cancelled';
  elsif p_action = 'resume' and l.status = 'cancelled' then
    next_status := 'published';
  elsif p_action = 'withdraw' and l.status in ('published', 'pending', 'cancelled') then
    next_status := 'draft';
  else
    raise exception 'That cannot be done to this publication now.' using errcode = 'P0001';
  end if;

  perform set_config('community.listing_rpc', '1', true);
  update public.community_listings
  set status = next_status,
      schedule_note = case when p_action = 'cancel' then left(nullif(btrim(coalesce(p_note, '')), ''), 300) when p_action = 'resume' then null else schedule_note end,
      postponed = case when p_action = 'resume' then false else postponed end,
      hold_reason = case when next_status = 'draft' then null else hold_reason end
  where id = l.id;
  perform set_config('community.listing_rpc', '', true);
  return next_status;
end;
$$;

-- Tidying: published listings whose time has passed are marked 'expired'. An event is over when it ends (or six hours after it starts,
-- if no end is given); a repeating one when its repeats end; an announcement or promotion on its expiry date. Callable by a moderator
-- or by the database's own scheduler; the site does not depend on it, because it works the same thing out from the dates when it shows them.
create or replace function public.community_expire_listings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is not null and not public.is_moderator() then
    raise exception 'Only a moderator can do that.' using errcode = 'P0001';
  end if;
  perform set_config('community.listing_rpc', '1', true);
  update public.community_listings
  set status = 'expired'
  where status = 'published'
    and case
          when recurrence <> 'none' then ((recurrence_until + 1)::timestamp at time zone 'Asia/Tokyo') < now()
          when kind in ('event', 'activity') then coalesce(ends_at, starts_at + interval '6 hours') < now()
          else ends_at is not null and ends_at < now()
        end;
  get diagnostics n = row_count;
  perform set_config('community.listing_rpc', '', true);
  return n;
end;
$$;

revoke all on function public.community_listing_submit(uuid) from public, anon;
revoke all on function public.community_listing_set_state(uuid, text, text) from public, anon;
revoke all on function public.community_expire_listings() from public, anon;
grant execute on function public.community_listing_submit(uuid) to authenticated;
grant execute on function public.community_listing_set_state(uuid, text, text) to authenticated;
grant execute on function public.community_expire_listings() to authenticated;

-- ───────────────────────── media ─────────────────────────

create table if not exists public.community_listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.community_listings(id) on delete cascade,
  kind text not null default 'image',
  storage_path text,          -- inside the 'community-photos' bucket, in the author's own folder
  thumb_path text,
  width integer,
  height integer,
  alt text,
  video_url text,             -- a YouTube or Vimeo link; video files are never stored
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint community_listing_media_kind check (kind in ('image', 'video')),
  constraint community_listing_media_fields check (
    (kind = 'image' and storage_path is not null and video_url is null)
    or (kind = 'video' and video_url is not null and storage_path is null)
  ),
  constraint community_listing_media_video check (video_url ~ '^https://((www\.)?youtube\.com/(watch\?v=|embed/)|youtu\.be/|(www\.)?vimeo\.com/|player\.vimeo\.com/video/)[A-Za-z0-9_?=&/-]{3,80}$'),
  constraint community_listing_media_position check (position between 0 and 11),
  constraint community_listing_media_size check ((width is null or width between 1 and 10000) and (height is null or height between 1 and 10000)),
  constraint community_listing_media_alt_len check (char_length(alt) <= 200),
  unique (listing_id, position)
);

create unique index if not exists community_listing_media_path_idx on public.community_listing_media (storage_path) where storage_path is not null;
create index if not exists community_listing_media_listing_idx on public.community_listing_media (listing_id, position);

alter table public.community_listing_media enable row level security;

drop policy if exists "Read media of visible listings" on public.community_listing_media;
create policy "Read media of visible listings" on public.community_listing_media
  for select using (
    exists (
      select 1 from public.community_listings l
      where l.id = listing_id
        and (l.status in ('published', 'cancelled', 'expired') or l.user_id = auth.uid() or public.is_moderator())
    )
  );

drop policy if exists "Add media to own listings" on public.community_listing_media;
create policy "Add media to own listings" on public.community_listing_media
  for insert with check (exists (select 1 from public.community_listings l where l.id = listing_id and l.user_id = auth.uid()));

drop policy if exists "Change media of own listings" on public.community_listing_media;
create policy "Change media of own listings" on public.community_listing_media
  for update using (exists (select 1 from public.community_listings l where l.id = listing_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.community_listings l where l.id = listing_id and l.user_id = auth.uid()));

drop policy if exists "Remove media from own listings or moderate" on public.community_listing_media;
create policy "Remove media from own listings or moderate" on public.community_listing_media
  for delete using (
    exists (select 1 from public.community_listings l where l.id = listing_id and (l.user_id = auth.uid() or public.is_moderator()))
  );

-- A photograph must be one the upload step accepted from this very person (so it was re-encoded and stripped of location data),
-- can be used once, and a listing can only carry so many.
create or replace function public.community_listing_media_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  s public.community_settings;
  n integer;
begin
  select user_id into owner from public.community_listings where id = new.listing_id;
  if auth.uid() is not null and not public.is_moderator() then
    if owner is distinct from auth.uid() then
      raise exception 'That publication could not be found.' using errcode = 'P0001';
    end if;
    if new.kind = 'image' then
      if tg_op = 'INSERT' or new.storage_path is distinct from old.storage_path then
        if new.storage_path not like auth.uid()::text || '/%' or new.thumb_path not like auth.uid()::text || '/%' then
          raise exception 'Some photos could not be found. Please add them again.' using errcode = 'P0001';
        end if;
        if not exists (select 1 from public.community_uploads u where u.user_id = auth.uid() and u.path = new.storage_path and u.thumb_path = new.thumb_path) then
          raise exception 'Some photos could not be found. Please add them again.' using errcode = 'P0001';
        end if;
      end if;
    end if;
    if tg_op = 'INSERT' then
      select * into s from public.community_settings where id;
      select count(*) into n from public.community_listing_media where listing_id = new.listing_id and kind = new.kind;
      if new.kind = 'image' and n >= coalesce(s.max_listing_images, 10) then
        raise exception 'You can add up to % photos.', coalesce(s.max_listing_images, 10) using errcode = 'P0001';
      end if;
      if new.kind = 'video' and n >= 1 then
        raise exception 'You can add one video link.' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists community_listing_media_before_write on public.community_listing_media;
create trigger community_listing_media_before_write
  before insert or update on public.community_listing_media
  for each row execute function public.community_listing_media_before_write();

-- ───────────────────────── reports and the moderation log can point at a listing ─────────────────────────

alter table public.community_reports drop constraint if exists community_reports_target_type;
alter table public.community_reports
  add constraint community_reports_target_type check (target_type in ('post', 'comment', 'review', 'question', 'answer', 'user', 'listing'));

alter table public.community_moderation_log drop constraint if exists community_moderation_log_target;
alter table public.community_moderation_log
  add constraint community_moderation_log_target check (target_type in ('post', 'comment', 'review', 'question', 'answer', 'user', 'listing'));

alter table public.community_moderation_log drop constraint if exists community_moderation_log_action;
alter table public.community_moderation_log
  add constraint community_moderation_log_action check (action in ('hide', 'restore', 'approve', 'reject', 'delete', 'dismiss', 'reviewed', 'suspend', 'unsuspend', 'feature', 'unfeature'));

-- Same function as before (0006), with one more kind of target.
create or replace function public.community_reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
  found_target boolean;
begin
  if auth.uid() is not null and not public.is_moderator() then
    select count(*) into recent from public.community_reports
    where reporter_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= 20 then
      raise exception 'You are reporting too quickly. Please wait a little.' using errcode = 'P0001';
    end if;
  end if;

  found_target := case new.target_type
    when 'post' then exists (select 1 from public.community_posts where id = new.target_id)
    when 'review' then exists (select 1 from public.community_reviews where id = new.target_id)
    when 'question' then exists (select 1 from public.community_questions where id = new.target_id)
    when 'answer' then exists (select 1 from public.community_answers where id = new.target_id)
    when 'comment' then exists (select 1 from public.community_comments where id = new.target_id)
    when 'listing' then exists (select 1 from public.community_listings where id = new.target_id)
    else true
  end;
  if not found_target then
    raise exception 'That content does not exist.' using errcode = 'P0001';
  end if;

  new.status := 'open';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.created_at := now();
  return new;
end;
$$;

-- ───────────────────────── lock down the trigger functions ─────────────────────────

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- ───────────────────────── after running ─────────────────────────
-- Optional switch: make every submission wait for a moderator (off by default):
--
--   update public.community_settings set listings_require_approval = true where id;
