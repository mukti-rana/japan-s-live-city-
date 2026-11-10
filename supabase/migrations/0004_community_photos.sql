-- LIVE CITY JAPAN — Community, phase 2: photos, likes, saves and reports.
--
-- Run AFTER 0003_community_foundation.sql, in the Supabase SQL editor.
-- Safe to run more than once; it never drops or rewrites existing data.
--
-- What this adds:
--   * the public 'community-photos' Storage bucket (WebP files only, small), where each
--     person can only add files inside a folder named after their own user id
--   * community_uploads   a log of every photo the server accepted (rate limit + the
--     server's record of the real size of each photo)
--   * community_post_likes / community_post_saves   one row per person per post, with
--     triggers that keep the post's counters right
--   * community_reports   "report this" from readers, for moderators (phase 6)
--   * a duplicate-submission guard on posts (client_key)
--
-- No service-role key is used anywhere: all of this runs as the signed-in person,
-- with Row Level Security deciding what is allowed.

-- ───────────────────────── storage bucket ─────────────────────────

-- Public read (photos of published posts are shown to everyone). Only WebP up to
-- 3 MB is accepted: the website's server re-encodes every upload to WebP itself,
-- which also removes camera metadata such as GPS location.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-photos', 'community-photos', true, 3145728, array['image/webp'])
on conflict (id) do nothing;

drop policy if exists "Community photos are readable" on storage.objects;
create policy "Community photos are readable" on storage.objects
  for select using (bucket_id = 'community-photos');

-- Add files only inside your own folder: <your user id>/<file>.
drop policy if exists "Community photos: add to own folder" on storage.objects;
create policy "Community photos: add to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Remove files from your own folder (moderators may remove any).
drop policy if exists "Community photos: remove own or moderate" on storage.objects;
create policy "Community photos: remove own or moderate" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()));

-- ───────────────────────── upload log ─────────────────────────

create table if not exists public.community_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  path text not null unique,
  thumb_path text not null,
  width integer not null,
  height integer not null,
  post_id uuid references public.community_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint community_uploads_size check (width between 1 and 10000 and height between 1 and 10000),
  constraint community_uploads_own_folder check (path like user_id::text || '/%' and thumb_path like user_id::text || '/%')
);

create index if not exists community_uploads_user_idx on public.community_uploads (user_id, created_at desc);

alter table public.community_uploads enable row level security;

drop policy if exists "See own uploads" on public.community_uploads;
create policy "See own uploads" on public.community_uploads for select using (auth.uid() = user_id);

drop policy if exists "Log own uploads" on public.community_uploads;
create policy "Log own uploads" on public.community_uploads for insert with check (auth.uid() = user_id);

drop policy if exists "Attach own uploads to a post" on public.community_uploads;
create policy "Attach own uploads to a post" on public.community_uploads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Delete own uploads" on public.community_uploads;
create policy "Delete own uploads" on public.community_uploads for delete using (auth.uid() = user_id);

-- A person can only add so many photos per hour; and an upload can only ever be
-- attached to one of their OWN posts, with its path and size left as logged.
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
  end if;
  return new;
end;
$$;

drop trigger if exists community_uploads_guard on public.community_uploads;
create trigger community_uploads_guard
  before insert or update on public.community_uploads
  for each row execute function public.community_uploads_guard();

-- ───────────────────────── posts: duplicate-submission guard ─────────────────────────

-- The browser sends a random key with each submission, so pressing "Share" twice
-- (or a flaky connection retrying) can never create two posts.
alter table public.community_posts add column if not exists client_key uuid;
create unique index if not exists community_posts_client_key_idx
  on public.community_posts (user_id, client_key) where client_key is not null;

-- Same rules as before, plus: counters may be changed by the like/save triggers
-- below (and only by them), and an author can never change client_key.
create or replace function public.community_posts_before_update()
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
    new.status := old.status;
    new.created_at := old.created_at;
    new.published_at := old.published_at;
    new.client_key := old.client_key;
    if not counting then
      new.like_count := old.like_count;
      new.comment_count := old.comment_count;
      new.save_count := old.save_count;
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

-- ───────────────────────── post images: limits ─────────────────────────

drop policy if exists "Add images to own posts" on public.community_post_images;
create policy "Add images to own posts" on public.community_post_images
  for insert with check (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id
        and p.user_id = auth.uid()
        and storage_path like p.user_id::text || '/%'
        and (thumb_path is null or thumb_path like p.user_id::text || '/%')
    )
  );

create or replace function public.community_post_images_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_images integer;
  have integer;
begin
  select coalesce(max_images_per_post, 8) into max_images from public.community_settings where id;
  select count(*) into have from public.community_post_images where post_id = new.post_id;
  if have >= coalesce(max_images, 8) then
    raise exception 'A post can have at most % photos.', coalesce(max_images, 8) using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists community_post_images_before_insert on public.community_post_images;
create trigger community_post_images_before_insert
  before insert on public.community_post_images
  for each row execute function public.community_post_images_before_insert();

-- ───────────────────────── likes and saves ─────────────────────────

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists community_post_likes_user_idx on public.community_post_likes (user_id, created_at desc);

create table if not exists public.community_post_saves (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists community_post_saves_user_idx on public.community_post_saves (user_id, created_at desc);

alter table public.community_post_likes enable row level security;
alter table public.community_post_saves enable row level security;

-- You can see only your own likes and saves (the public sees the totals on the post).
-- A like or save can only be added to a published post, and only for yourself.
drop policy if exists "See own likes" on public.community_post_likes;
create policy "See own likes" on public.community_post_likes for select using (auth.uid() = user_id);
drop policy if exists "Like as yourself" on public.community_post_likes;
create policy "Like as yourself" on public.community_post_likes
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published')
  );
drop policy if exists "Remove own like" on public.community_post_likes;
create policy "Remove own like" on public.community_post_likes for delete using (auth.uid() = user_id);

drop policy if exists "See own saves" on public.community_post_saves;
create policy "See own saves" on public.community_post_saves for select using (auth.uid() = user_id);
drop policy if exists "Save as yourself" on public.community_post_saves;
create policy "Save as yourself" on public.community_post_saves
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published')
  );
drop policy if exists "Remove own save" on public.community_post_saves;
create policy "Remove own save" on public.community_post_saves for delete using (auth.uid() = user_id);

-- Keeps like_count / save_count equal to the real number of rows. The pair of
-- set_config calls lets only this update past the "counters are read-only" rule.
create or replace function public.community_count_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  target uuid := case when tg_op = 'INSERT' then new.post_id else old.post_id end;
  recent integer;
begin
  if tg_op = 'INSERT' and auth.uid() is not null and not public.is_moderator() then
    -- At most 200 likes + saves an hour per person: enough for browsing, not for farming.
    select (select count(*) from public.community_post_likes where user_id = auth.uid() and created_at > now() - interval '1 hour')
         + (select count(*) from public.community_post_saves where user_id = auth.uid() and created_at > now() - interval '1 hour')
      into recent;
    if recent > 200 then
      raise exception 'You are doing that too quickly. Please wait a little.' using errcode = 'P0001';
    end if;
  end if;

  perform set_config('community.counters', 'on', true);
  if tg_table_name = 'community_post_likes' then
    update public.community_posts set like_count = greatest(0, like_count + delta) where id = target;
  else
    update public.community_posts set save_count = greatest(0, save_count + delta) where id = target;
  end if;
  perform set_config('community.counters', '', true);
  return null;
end;
$$;

drop trigger if exists community_like_counter on public.community_post_likes;
create trigger community_like_counter
  after insert or delete on public.community_post_likes
  for each row execute function public.community_count_reaction();

drop trigger if exists community_save_counter on public.community_post_saves;
create trigger community_save_counter
  after insert or delete on public.community_post_saves
  for each row execute function public.community_count_reaction();

-- ───────────────────────── reports ─────────────────────────

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  -- Phase 2 reports posts; later phases add comments, reviews, questions, answers and people.
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint community_reports_target_type check (target_type in ('post', 'comment', 'review', 'question', 'answer', 'user')),
  constraint community_reports_reason check (reason in ('inappropriate', 'fake', 'spam', 'harassment', 'misleading', 'copyright', 'unsafe')),
  constraint community_reports_details_len check (char_length(details) <= 1000),
  constraint community_reports_status check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  unique (reporter_id, target_type, target_id)
);
create index if not exists community_reports_status_idx on public.community_reports (status, created_at desc);

alter table public.community_reports enable row level security;

drop policy if exists "Report as yourself" on public.community_reports;
create policy "Report as yourself" on public.community_reports for insert with check (auth.uid() = reporter_id);

-- You can see your own reports; moderators see all of them.
drop policy if exists "See own reports or moderate" on public.community_reports;
create policy "See own reports or moderate" on public.community_reports
  for select using (auth.uid() = reporter_id or public.is_moderator());

drop policy if exists "Moderators review reports" on public.community_reports;
create policy "Moderators review reports" on public.community_reports
  for update using (public.is_moderator()) with check (public.is_moderator());

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
  new.status := 'open';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists community_reports_before_insert on public.community_reports;
create trigger community_reports_before_insert
  before insert on public.community_reports
  for each row execute function public.community_reports_before_insert();
