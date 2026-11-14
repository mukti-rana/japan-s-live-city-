-- LIVE CITY JAPAN — Community: photos, a topic and an optional place on questions.
--
-- Run AFTER 0003 … 0011, in the Supabase SQL editor. Safe to run more than once.
-- Purely additive: no row is deleted or rewritten, and every existing question keeps
-- its area, place, answers and votes exactly as they are.
--
-- What this adds:
--   * community_questions.category_slug   an optional topic (food, nature, culture…), the same
--                                          topics posts use
--   * community_questions.area_id         may now be empty: a question can be about Japan in
--                                          general, not only about one prefecture
--   * community_question_images           up to 4 photos per question, stored exactly like post
--                                          photos (same public 'community-photos' bucket, files in
--                                          the author's own folder, shrunk and stripped of GPS data
--                                          by the website's server before they are stored)
--   * community_uploads.question_id       marks an uploaded photo as used by a question, so one
--                                          upload can never be attached twice
--
-- Safety (same rules as for posts):
--   * Row Level Security on the new table; anyone can see the photos of published questions,
--     only the author can add photos to their own question, only the author (or a moderator)
--     can remove them.
--   * A photo path must sit inside the author's own folder.
--   * At most 4 photos per question, enforced by the database.

-- ───────────────────────── optional area, optional topic ─────────────────────────

alter table public.community_questions alter column area_id drop not null;

alter table public.community_questions add column if not exists category_slug text;
alter table public.community_questions drop constraint if exists community_questions_category;
alter table public.community_questions add constraint community_questions_category
  check (category_slug is null or category_slug ~ '^[a-z][a-z0-9-]{1,40}$');

create index if not exists community_questions_category_idx
  on public.community_questions (category_slug, status, published_at desc) where category_slug is not null;

-- Same rules as before (0011), plus: the author cannot change the topic afterwards.
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
    new.category_slug := old.category_slug;
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

revoke execute on function public.community_questions_before_update() from public, anon, authenticated;

-- ───────────────────────── question photos ─────────────────────────

create table if not exists public.community_question_images (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.community_questions(id) on delete cascade,
  storage_path text not null,     -- path inside the 'community-photos' bucket
  thumb_path text,
  width integer,
  height integer,
  alt text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint community_question_images_position check (position between 0 and 3),
  constraint community_question_images_size check ((width is null or width between 1 and 10000) and (height is null or height between 1 and 10000)),
  constraint community_question_images_alt_len check (char_length(alt) <= 200),
  unique (question_id, position)
);

create index if not exists community_question_images_question_idx on public.community_question_images (question_id, position);

alter table public.community_question_images enable row level security;

drop policy if exists "Read photos of visible questions" on public.community_question_images;
create policy "Read photos of visible questions" on public.community_question_images
  for select using (
    exists (
      select 1 from public.community_questions q
      where q.id = question_id
        and (q.status = 'published' or q.user_id = auth.uid() or public.is_moderator())
    )
  );

drop policy if exists "Add photos to own questions" on public.community_question_images;
create policy "Add photos to own questions" on public.community_question_images
  for insert with check (
    exists (
      select 1 from public.community_questions q
      where q.id = question_id
        and q.user_id = auth.uid()
        and storage_path like q.user_id::text || '/%'
        and (thumb_path is null or thumb_path like q.user_id::text || '/%')
    )
  );

drop policy if exists "Remove photos from own questions or moderate" on public.community_question_images;
create policy "Remove photos from own questions or moderate" on public.community_question_images
  for delete using (
    exists (
      select 1 from public.community_questions q
      where q.id = question_id and (q.user_id = auth.uid() or public.is_moderator())
    )
  );

create or replace function public.community_question_images_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  have integer;
begin
  select count(*) into have from public.community_question_images where question_id = new.question_id;
  if have >= 4 then
    raise exception 'A question can have at most 4 photos.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists community_question_images_before_insert on public.community_question_images;
create trigger community_question_images_before_insert
  before insert on public.community_question_images
  for each row execute function public.community_question_images_before_insert();

revoke execute on function public.community_question_images_before_insert() from public, anon, authenticated;

-- ───────────────────────── upload log: used by a question ─────────────────────────

alter table public.community_uploads add column if not exists question_id uuid references public.community_questions(id) on delete set null;

-- Same rules as before (0004), plus: an upload can be attached to one of the
-- person's OWN questions (and, as before, to one of their own posts).
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
    new.question_id := null;
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
    if new.question_id is not null and not exists (
      select 1 from public.community_questions q where q.id = new.question_id and q.user_id = new.user_id
    ) then
      raise exception 'That question is not yours.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.community_uploads_guard() from public, anon, authenticated;
