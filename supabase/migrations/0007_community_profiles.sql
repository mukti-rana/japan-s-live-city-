-- LIVE CITY JAPAN — Community, phase 5: profiles, Been Here and notifications.
--
-- Run AFTER 0003 to 0006, in the Supabase SQL editor. Safe to run more than once.
--
-- Adds:
--   * profile privacy switches (show my numbers, show my visited places) and safety rules
--     for changing a username or picture
--   * community_visited          "Been here": places a person marked as visited
--   * community_profile_stats()  the contribution numbers shown on a profile
--   * community_notifications    "someone liked your post", "someone answered your question", ...
--   * community_notification_prefs   which kinds of notification a person wants
--
-- Privacy by design:
--   * Visited places are PRIVATE unless the person turns sharing on.
--   * Contribution numbers are hidden from others if the person turns them off.
--   * Notifications can only be created by the database itself (triggers); a person can
--     only read and mark their own as read. They merge instead of repeating.
--   * A profile picture can only be one the person uploaded to their own folder.

-- ───────────────────────── profile switches and safety ─────────────────────────

alter table public.profiles add column if not exists show_stats boolean not null default true;
alter table public.profiles add column if not exists show_visited boolean not null default false;
alter table public.profiles add column if not exists username_changed_at timestamptz;

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_name text := 'traveler_' || substr(replace(old.id::text, '-', ''), 1, 8);
begin
  if auth.uid() is not null and not public.is_moderator() then
    new.id := old.id;
    new.created_at := old.created_at;

    if new.username is distinct from old.username then
      -- Names that could pass for the site or its staff, and other people's generated names, are off limits.
      if new.username in ('admin', 'administrator', 'moderator', 'mod', 'support', 'staff', 'official', 'system', 'root', 'help', 'livecity', 'live_city', 'livecityjapan', 'null', 'undefined', 'anonymous')
         or (new.username like 'traveler\_%' and new.username <> default_name) then
        raise exception 'That username is not available.' using errcode = 'P0001';
      end if;
      -- A chosen username can change once every 30 days (the first change from the generated one is free).
      if old.username <> default_name and old.username_changed_at is not null and old.username_changed_at > now() - interval '30 days' then
        raise exception 'You can change your username once every 30 days.' using errcode = 'P0001';
      end if;
      new.username_changed_at := now();
    else
      new.username_changed_at := old.username_changed_at;
    end if;

    -- A picture must be one this person uploaded to their own folder (not any web address).
    if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null
       and position('/storage/v1/object/public/community-photos/' || old.id::text || '/' in new.avatar_url) = 0 then
      raise exception 'That picture is not allowed.' using errcode = 'P0001';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- ───────────────────────── been here ─────────────────────────

create table if not exists public.community_visited (
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_ref text not null,
  area_id text not null,
  visited_at timestamptz not null default now(),
  primary key (user_id, place_ref),
  constraint community_visited_place_ref check (place_ref ~ '^Q[0-9]{1,12}$'),
  constraint community_visited_area check (area_id ~ '^[a-z]{2,30}$')
);
create index if not exists community_visited_user_idx on public.community_visited (user_id, visited_at desc);

alter table public.community_visited enable row level security;

-- Your own always; other people's only if they chose to share.
drop policy if exists "See own or shared visited places" on public.community_visited;
create policy "See own or shared visited places" on public.community_visited
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = user_id and p.show_visited)
  );
drop policy if exists "Mark places visited as yourself" on public.community_visited;
create policy "Mark places visited as yourself" on public.community_visited for insert with check (auth.uid() = user_id);
drop policy if exists "Unmark own visited places" on public.community_visited;
create policy "Unmark own visited places" on public.community_visited for delete using (auth.uid() = user_id);

create or replace function public.community_visited_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if auth.uid() is not null and not public.is_moderator() then
    select count(*) into recent from public.community_visited
    where user_id = auth.uid() and visited_at > now() - interval '1 hour';
    if recent >= 100 then
      raise exception 'You are doing that too quickly. Please wait a little.' using errcode = 'P0001';
    end if;
  end if;
  new.visited_at := now();
  return new;
end;
$$;

drop trigger if exists community_visited_before_insert on public.community_visited;
create trigger community_visited_before_insert
  before insert on public.community_visited
  for each row execute function public.community_visited_before_insert();

-- ───────────────────────── profile statistics ─────────────────────────

-- The contribution numbers for one person, from published content only. Others see
-- them only if the person allows it (no row comes back otherwise); the person always
-- sees their own. Runs as the caller, so Row Level Security applies.
create or replace function public.community_profile_stats(p_user uuid)
returns table (posts bigint, reviews bigint, questions bigint, answers bigint, helpful_received bigint, visited bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.community_posts where user_id = p_user and status = 'published'),
    (select count(*) from public.community_reviews where user_id = p_user and status = 'published'),
    (select count(*) from public.community_questions where user_id = p_user and status = 'published'),
    (select count(*) from public.community_answers where user_id = p_user and status = 'published'),
    coalesce((select sum(helpful_count) from public.community_answers where user_id = p_user and status = 'published'), 0)
      + coalesce((select sum(helpful_count) from public.community_reviews where user_id = p_user and status = 'published'), 0),
    (select count(*) from public.community_visited where user_id = p_user)
  where exists (select 1 from public.profiles p where p.id = p_user and (p.show_stats or p.id = auth.uid()));
$$;

grant execute on function public.community_profile_stats(uuid) to anon, authenticated;

-- ───────────────────────── notification preferences ─────────────────────────

create table if not exists public.community_notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  likes boolean not null default true,       -- someone liked your post
  comments boolean not null default true,    -- comments and replies
  answers boolean not null default true,     -- someone answered your question
  helpful boolean not null default true,     -- helpful votes on your answers and reviews
  updated_at timestamptz not null default now()
);

alter table public.community_notification_prefs enable row level security;

drop policy if exists "See own notification settings" on public.community_notification_prefs;
create policy "See own notification settings" on public.community_notification_prefs for select using (auth.uid() = user_id);
drop policy if exists "Create own notification settings" on public.community_notification_prefs;
create policy "Create own notification settings" on public.community_notification_prefs for insert with check (auth.uid() = user_id);
drop policy if exists "Change own notification settings" on public.community_notification_prefs;
create policy "Change own notification settings" on public.community_notification_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.community_wants(p_user uuid, p_group text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case p_group
              when 'likes' then likes
              when 'comments' then comments
              when 'answers' then answers
              when 'helpful' then helpful
              else true
            end
     from public.community_notification_prefs where user_id = p_user),
    true);
$$;

-- ───────────────────────── notifications ─────────────────────────

create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,   -- who it is for
  actor_id uuid references public.profiles(id) on delete set null,          -- who did it
  kind text not null,
  target_id uuid not null,
  link_path text not null,
  count integer not null default 1,        -- merged repeats ("3 people liked your post")
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint community_notifications_kind check (kind in ('post_like', 'post_comment', 'comment_reply', 'answer_reply', 'question_answered', 'answer_helpful', 'review_helpful')),
  constraint community_notifications_link check (link_path like '/community/%'),
  constraint community_notifications_count check (count >= 1)
);

create index if not exists community_notifications_user_idx on public.community_notifications (user_id, created_at desc);
create index if not exists community_notifications_unread_idx on public.community_notifications (user_id) where read_at is null;
-- Likes and helpful votes on the same thing merge into one notification instead of many.
create unique index if not exists community_notifications_merge_idx
  on public.community_notifications (user_id, kind, target_id)
  where kind in ('post_like', 'answer_helpful', 'review_helpful');

alter table public.community_notifications enable row level security;

drop policy if exists "See own notifications" on public.community_notifications;
create policy "See own notifications" on public.community_notifications for select using (auth.uid() = user_id);
drop policy if exists "Mark own notifications read" on public.community_notifications;
create policy "Mark own notifications read" on public.community_notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Delete own notifications" on public.community_notifications;
create policy "Delete own notifications" on public.community_notifications for delete using (auth.uid() = user_id);
-- No insert policy: only the triggers below can create notifications.

-- All a person can change on a notification is when they read it.
create or replace function public.community_notifications_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.user_id := old.user_id;
    new.actor_id := old.actor_id;
    new.kind := old.kind;
    new.target_id := old.target_id;
    new.link_path := old.link_path;
    new.count := old.count;
    new.created_at := old.created_at;
    new.read_at := case when new.read_at is not null then coalesce(old.read_at, now()) else old.read_at end;
  end if;
  return new;
end;
$$;

drop trigger if exists community_notifications_before_update on public.community_notifications;
create trigger community_notifications_before_update
  before update on public.community_notifications
  for each row execute function public.community_notifications_before_update();

-- The one place notifications are made. Never for your own actions, never if the person
-- switched that kind off, and likes / helpful votes merge into one unread notification.
create or replace function public.community_notify(p_user uuid, p_actor uuid, p_kind text, p_target uuid, p_link text, p_group text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  if not public.community_wants(p_user, p_group) then return; end if;
  if p_kind in ('post_like', 'answer_helpful', 'review_helpful') then
    insert into public.community_notifications (user_id, actor_id, kind, target_id, link_path)
    values (p_user, p_actor, p_kind, p_target, p_link)
    on conflict (user_id, kind, target_id) where kind in ('post_like', 'answer_helpful', 'review_helpful')
    do update set count = public.community_notifications.count + 1, actor_id = excluded.actor_id, read_at = null, created_at = now();
  else
    insert into public.community_notifications (user_id, actor_id, kind, target_id, link_path)
    values (p_user, p_actor, p_kind, p_target, p_link);
  end if;
end;
$$;

revoke all on function public.community_notify(uuid, uuid, text, uuid, text, text) from public;

-- someone liked your post
create or replace function public.community_notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.community_posts where id = new.post_id;
  perform public.community_notify(owner, new.user_id, 'post_like', new.post_id, '/community/post/' || new.post_id, 'likes');
  return null;
end;
$$;
drop trigger if exists community_notify_post_like on public.community_post_likes;
create trigger community_notify_post_like after insert on public.community_post_likes for each row execute function public.community_notify_post_like();

-- someone commented on your post, replied to your comment, or replied under your answer
create or replace function public.community_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  parent_author uuid;
  qid uuid;
  link text;
begin
  if new.parent_id is not null then
    select user_id into parent_author from public.community_comments where id = new.parent_id;
  end if;

  if new.post_id is not null then
    select user_id into owner from public.community_posts where id = new.post_id;
    link := '/community/post/' || new.post_id;
    perform public.community_notify(parent_author, new.user_id, 'comment_reply', new.id, link, 'comments');
    if owner is distinct from parent_author then
      perform public.community_notify(owner, new.user_id, 'post_comment', new.id, link, 'comments');
    end if;
  else
    select a.user_id, a.question_id into owner, qid from public.community_answers a where a.id = new.answer_id;
    link := '/community/question/' || qid;
    perform public.community_notify(parent_author, new.user_id, 'comment_reply', new.id, link, 'comments');
    if owner is distinct from parent_author then
      perform public.community_notify(owner, new.user_id, 'answer_reply', new.id, link, 'comments');
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists community_notify_comment on public.community_comments;
create trigger community_notify_comment after insert on public.community_comments for each row execute function public.community_notify_comment();

-- someone answered your question
create or replace function public.community_notify_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.community_questions where id = new.question_id;
  perform public.community_notify(owner, new.user_id, 'question_answered', new.id, '/community/question/' || new.question_id, 'answers');
  return null;
end;
$$;
drop trigger if exists community_notify_answer on public.community_answers;
create trigger community_notify_answer after insert on public.community_answers for each row execute function public.community_notify_answer();

-- someone marked your answer helpful
create or replace function public.community_notify_answer_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author uuid;
  qid uuid;
begin
  select user_id, question_id into author, qid from public.community_answers where id = new.answer_id;
  perform public.community_notify(author, new.user_id, 'answer_helpful', new.answer_id, '/community/question/' || qid, 'helpful');
  return null;
end;
$$;
drop trigger if exists community_notify_answer_helpful on public.community_answer_helpful;
create trigger community_notify_answer_helpful after insert on public.community_answer_helpful for each row execute function public.community_notify_answer_helpful();

-- someone marked your review helpful
create or replace function public.community_notify_review_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author uuid;
  place text;
begin
  select user_id, place_ref into author, place from public.community_reviews where id = new.review_id;
  perform public.community_notify(author, new.user_id, 'review_helpful', new.review_id, '/community/place/' || place || '#reviews', 'helpful');
  return null;
end;
$$;
drop trigger if exists community_notify_review_helpful on public.community_review_helpful;
create trigger community_notify_review_helpful after insert on public.community_review_helpful for each row execute function public.community_notify_review_helpful();
