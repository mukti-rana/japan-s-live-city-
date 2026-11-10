-- LIVE CITY JAPAN — Community, phase 4: discussion.
--
-- Run AFTER 0003, 0004 and 0005, in the Supabase SQL editor. Safe to run more than once.
--
-- Adds:
--   community_questions       a question about a place (place_ref set) or about an area
--                             ("Ask a Local": place_ref empty)
--   community_answers         answers to a question (one per person per question)
--   community_answer_helpful  "this answer was helpful" votes
--   community_comments        comments on photo posts AND replies to answers, threaded
--                             up to 3 levels (a comment, a reply, a reply to that reply)
--   community_comment_likes   likes on comments
--
-- Rules enforced by the database (not just the website):
--   * You can only post as yourself, and only on content that is published.
--   * You can edit and delete only your own words; status and counters are not yours to set.
--   * Replies must belong to the same thread, and nesting stops at 3 levels.
--   * Anti-spam: hourly limits on questions, answers, comments and likes, and the same
--     comment cannot be posted twice in a row on one thread.
--   * One answer per person per question, one vote per person per answer, one like per
--     person per comment, and no voting for your own answer.
--   * Counters (answers, comments, likes, helpful) are maintained by triggers.

-- ───────────────────────── questions ─────────────────────────

create table if not exists public.community_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  area_id text not null,
  place_ref text,                         -- Explore place id; empty for an "Ask a Local" question about the area
  title text not null,
  body text not null default '',
  status text not null default 'published',
  resolved boolean not null default false,
  answer_count integer not null default 0,
  helpful_count integer not null default 0,   -- total helpful votes across its answers
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint community_questions_area_format check (area_id ~ '^[a-z]{2,30}$'),
  constraint community_questions_place_ref check (place_ref ~ '^Q[0-9]{1,12}$'),
  constraint community_questions_title_len check (char_length(title) between 5 and 150),
  constraint community_questions_body_len check (char_length(body) <= 2000),
  constraint community_questions_status check (status in ('pending', 'published', 'hidden', 'rejected')),
  constraint community_questions_counts check (answer_count >= 0 and helpful_count >= 0)
);

create index if not exists community_questions_feed_idx on public.community_questions (status, published_at desc);
create index if not exists community_questions_area_idx on public.community_questions (area_id, status, published_at desc);
create index if not exists community_questions_place_idx on public.community_questions (place_ref, status, published_at desc) where place_ref is not null;
create index if not exists community_questions_answers_idx on public.community_questions (status, answer_count desc, published_at desc);
create index if not exists community_questions_helpful_idx on public.community_questions (status, helpful_count desc, published_at desc);
create index if not exists community_questions_user_idx on public.community_questions (user_id, created_at desc);

alter table public.community_questions enable row level security;

drop policy if exists "Read published questions" on public.community_questions;
create policy "Read published questions" on public.community_questions
  for select using (status = 'published' or auth.uid() = user_id or public.is_moderator());
drop policy if exists "Ask as yourself" on public.community_questions;
create policy "Ask as yourself" on public.community_questions for insert with check (auth.uid() = user_id);
drop policy if exists "Edit own questions or moderate" on public.community_questions;
create policy "Edit own questions or moderate" on public.community_questions
  for update using (auth.uid() = user_id or public.is_moderator()) with check (auth.uid() = user_id or public.is_moderator());
drop policy if exists "Delete own questions or moderate" on public.community_questions;
create policy "Delete own questions or moderate" on public.community_questions
  for delete using (auth.uid() = user_id or public.is_moderator());

create or replace function public.community_questions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if auth.uid() is not null and not public.is_moderator() then
    select count(*) into recent from public.community_questions
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= 10 then
      raise exception 'You are posting too quickly. Please wait a little and try again.' using errcode = 'P0001';
    end if;
    new.status := 'published';
    new.resolved := false;
    new.answer_count := 0;
    new.helpful_count := 0;
  end if;
  new.created_at := now();
  new.updated_at := now();
  new.published_at := case when new.status = 'published' then now() else null end;
  return new;
end;
$$;

drop trigger if exists community_questions_before_insert on public.community_questions;
create trigger community_questions_before_insert
  before insert on public.community_questions
  for each row execute function public.community_questions_before_insert();

-- The asker may edit the words and mark it resolved; the place, area, status, counters and
-- dates are fixed. ('community.counters' lets only the answer triggers change the counters.)
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

drop trigger if exists community_questions_before_update on public.community_questions;
create trigger community_questions_before_update
  before update on public.community_questions
  for each row execute function public.community_questions_before_update();

-- ───────────────────────── answers ─────────────────────────

create table if not exists public.community_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.community_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  status text not null default 'published',
  helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_answers_body_len check (char_length(body) between 10 and 3000),
  constraint community_answers_status check (status in ('pending', 'published', 'hidden', 'rejected')),
  constraint community_answers_helpful check (helpful_count >= 0),
  unique (question_id, user_id)            -- one answer per person; edit it, or reply in the comments
);

create index if not exists community_answers_question_idx on public.community_answers (question_id, status, created_at);
create index if not exists community_answers_helpful_idx on public.community_answers (question_id, status, helpful_count desc);
create index if not exists community_answers_user_idx on public.community_answers (user_id, created_at desc);

alter table public.community_answers enable row level security;

drop policy if exists "Read answers of visible questions" on public.community_answers;
create policy "Read answers of visible questions" on public.community_answers
  for select using (
    (status = 'published' and exists (select 1 from public.community_questions q where q.id = question_id))
    or auth.uid() = user_id or public.is_moderator()
  );
drop policy if exists "Answer as yourself" on public.community_answers;
create policy "Answer as yourself" on public.community_answers for insert with check (auth.uid() = user_id);
drop policy if exists "Edit own answers or moderate" on public.community_answers;
create policy "Edit own answers or moderate" on public.community_answers
  for update using (auth.uid() = user_id or public.is_moderator()) with check (auth.uid() = user_id or public.is_moderator());
drop policy if exists "Delete own answers or moderate" on public.community_answers;
create policy "Delete own answers or moderate" on public.community_answers
  for delete using (auth.uid() = user_id or public.is_moderator());

create or replace function public.community_answers_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if not exists (select 1 from public.community_questions where id = new.question_id and status = 'published') then
    raise exception 'That question is not available.' using errcode = 'P0001';
  end if;
  if auth.uid() is not null and not public.is_moderator() then
    select count(*) into recent from public.community_answers
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= 20 then
      raise exception 'You are posting too quickly. Please wait a little and try again.' using errcode = 'P0001';
    end if;
    new.status := 'published';
    new.helpful_count := 0;
  end if;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists community_answers_before_insert on public.community_answers;
create trigger community_answers_before_insert
  before insert on public.community_answers
  for each row execute function public.community_answers_before_insert();

create or replace function public.community_answers_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  counting boolean := coalesce(current_setting('community.counters', true), '') = 'on';
begin
  if auth.uid() is not null and not public.is_moderator() then
    new.question_id := old.question_id;
    new.user_id := old.user_id;
    new.status := old.status;
    new.created_at := old.created_at;
    if not counting then
      new.helpful_count := old.helpful_count;
    end if;
  end if;
  -- updated_at moves only when the words change, so a helpful vote never makes an answer look edited.
  new.updated_at := case when new.body is distinct from old.body then now() else old.updated_at end;
  return new;
end;
$$;

drop trigger if exists community_answers_before_update on public.community_answers;
create trigger community_answers_before_update
  before update on public.community_answers
  for each row execute function public.community_answers_before_update();

-- Keeps a question's answer_count and helpful_count equal to what is really there
-- (published answers only), whenever an answer is added, removed or its status changes.
create or replace function public.community_recount_question()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  qid uuid := coalesce(new.question_id, old.question_id);
begin
  perform set_config('community.counters', 'on', true);
  update public.community_questions q set
    answer_count = (select count(*) from public.community_answers a where a.question_id = qid and a.status = 'published'),
    helpful_count = (select coalesce(sum(a.helpful_count), 0) from public.community_answers a where a.question_id = qid and a.status = 'published')
  where q.id = qid;
  perform set_config('community.counters', '', true);
  return null;
end;
$$;

drop trigger if exists community_answers_recount on public.community_answers;
create trigger community_answers_recount
  after insert or delete or update of status, helpful_count on public.community_answers
  for each row execute function public.community_recount_question();

-- ───────────────────────── helpful votes on answers ─────────────────────────

create table if not exists public.community_answer_helpful (
  answer_id uuid not null references public.community_answers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);
create index if not exists community_answer_helpful_user_idx on public.community_answer_helpful (user_id, created_at desc);

alter table public.community_answer_helpful enable row level security;

drop policy if exists "See own answer votes" on public.community_answer_helpful;
create policy "See own answer votes" on public.community_answer_helpful for select using (auth.uid() = user_id);
drop policy if exists "Vote on answers as yourself" on public.community_answer_helpful;
create policy "Vote on answers as yourself" on public.community_answer_helpful
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.community_answers a where a.id = answer_id and a.status = 'published' and a.user_id <> auth.uid())
  );
drop policy if exists "Remove own answer vote" on public.community_answer_helpful;
create policy "Remove own answer vote" on public.community_answer_helpful for delete using (auth.uid() = user_id);

create or replace function public.community_count_answer_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  target uuid := case when tg_op = 'INSERT' then new.answer_id else old.answer_id end;
  recent integer;
begin
  if tg_op = 'INSERT' and auth.uid() is not null and not public.is_moderator() then
    select count(*) into recent from public.community_answer_helpful
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent > 100 then
      raise exception 'You are doing that too quickly. Please wait a little.' using errcode = 'P0001';
    end if;
  end if;
  perform set_config('community.counters', 'on', true);
  update public.community_answers set helpful_count = greatest(0, helpful_count + delta) where id = target;
  perform set_config('community.counters', '', true);
  return null;
end;
$$;

drop trigger if exists community_answer_helpful_counter on public.community_answer_helpful;
create trigger community_answer_helpful_counter
  after insert or delete on public.community_answer_helpful
  for each row execute function public.community_count_answer_helpful();

-- ───────────────────────── comments (posts and answers) ─────────────────────────

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  answer_id uuid references public.community_answers(id) on delete cascade,
  parent_id uuid references public.community_comments(id) on delete cascade,
  depth smallint not null default 0,
  body text not null,
  status text not null default 'published',
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint community_comments_one_target check ((post_id is not null)::int + (answer_id is not null)::int = 1),
  constraint community_comments_depth check (depth between 0 and 2),
  constraint community_comments_body_len check (char_length(body) between 1 and 1000),
  constraint community_comments_status check (status in ('published', 'hidden', 'rejected')),
  constraint community_comments_likes check (like_count >= 0)
);

create index if not exists community_comments_post_idx on public.community_comments (post_id, status, created_at desc) where post_id is not null;
create index if not exists community_comments_answer_idx on public.community_comments (answer_id, status, created_at) where answer_id is not null;
create index if not exists community_comments_parent_idx on public.community_comments (parent_id) where parent_id is not null;
create index if not exists community_comments_user_idx on public.community_comments (user_id, created_at desc);

alter table public.community_comments enable row level security;

-- Visible while the thing commented on is visible to you (the inner selects obey the
-- same rules, so comments on a hidden post or answer are hidden too).
drop policy if exists "Read comments" on public.community_comments;
create policy "Read comments" on public.community_comments
  for select using (
    auth.uid() = user_id
    or public.is_moderator()
    or (
      status = 'published'
      and (
        (post_id is not null and exists (select 1 from public.community_posts p where p.id = post_id))
        or (answer_id is not null and exists (select 1 from public.community_answers a where a.id = answer_id))
      )
    )
  );
drop policy if exists "Comment as yourself" on public.community_comments;
create policy "Comment as yourself" on public.community_comments for insert with check (auth.uid() = user_id);
drop policy if exists "Edit own comments or moderate" on public.community_comments;
create policy "Edit own comments or moderate" on public.community_comments
  for update using (auth.uid() = user_id or public.is_moderator()) with check (auth.uid() = user_id or public.is_moderator());
drop policy if exists "Delete own comments or moderate" on public.community_comments;
create policy "Delete own comments or moderate" on public.community_comments
  for delete using (auth.uid() = user_id or public.is_moderator());

create or replace function public.community_comments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent public.community_comments;
  recent integer;
begin
  -- What is being commented on must exist and be published.
  if new.post_id is not null and not exists (select 1 from public.community_posts where id = new.post_id and status = 'published') then
    raise exception 'That post is not available.' using errcode = 'P0001';
  end if;
  if new.answer_id is not null and not exists (
    select 1 from public.community_answers a join public.community_questions q on q.id = a.question_id
    where a.id = new.answer_id and a.status = 'published' and q.status = 'published'
  ) then
    raise exception 'That answer is not available.' using errcode = 'P0001';
  end if;

  -- A reply must sit in the same thread, under a published comment, at most 3 levels deep.
  if new.parent_id is null then
    new.depth := 0;
  else
    select * into parent from public.community_comments where id = new.parent_id;
    if not found or parent.status <> 'published'
       or parent.post_id is distinct from new.post_id or parent.answer_id is distinct from new.answer_id then
      raise exception 'That comment is not available.' using errcode = 'P0001';
    end if;
    if parent.depth >= 2 then
      raise exception 'Replies can only go three levels deep.' using errcode = 'P0001';
    end if;
    new.depth := parent.depth + 1;
  end if;

  if auth.uid() is not null and not public.is_moderator() then
    select count(*) into recent from public.community_comments
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= 30 then
      raise exception 'You are commenting too quickly. Please wait a little.' using errcode = 'P0001';
    end if;
    -- The same words twice in a row on the same thread are a repeat, not a conversation.
    if exists (
      select 1 from public.community_comments c
      where c.user_id = auth.uid() and c.body = new.body
        and c.post_id is not distinct from new.post_id and c.answer_id is not distinct from new.answer_id
        and c.created_at > now() - interval '10 minutes'
    ) then
      raise exception 'You already posted that.' using errcode = 'P0001';
    end if;
    new.status := 'published';
    new.like_count := 0;
  end if;

  new.created_at := now();
  new.updated_at := now();
  new.edited_at := null;
  return new;
end;
$$;

drop trigger if exists community_comments_before_insert on public.community_comments;
create trigger community_comments_before_insert
  before insert on public.community_comments
  for each row execute function public.community_comments_before_insert();

-- Edits change the words only (and mark the comment as edited).
create or replace function public.community_comments_before_update()
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
    new.post_id := old.post_id;
    new.answer_id := old.answer_id;
    new.parent_id := old.parent_id;
    new.depth := old.depth;
    new.status := old.status;
    new.created_at := old.created_at;
    if not counting then
      new.like_count := old.like_count;
    end if;
  end if;
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists community_comments_before_update on public.community_comments;
create trigger community_comments_before_update
  before update on public.community_comments
  for each row execute function public.community_comments_before_update();

-- A post's comment_count is the number of published comments on it (replies included).
create or replace function public.community_recount_post_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid := coalesce(new.post_id, old.post_id);
begin
  if pid is not null then
    perform set_config('community.counters', 'on', true);
    update public.community_posts p set comment_count = (
      select count(*) from public.community_comments c where c.post_id = pid and c.status = 'published'
    ) where p.id = pid;
    perform set_config('community.counters', '', true);
  end if;
  return null;
end;
$$;

drop trigger if exists community_comments_recount on public.community_comments;
create trigger community_comments_recount
  after insert or delete or update of status on public.community_comments
  for each row execute function public.community_recount_post_comments();

-- ───────────────────────── comment likes ─────────────────────────

create table if not exists public.community_comment_likes (
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists community_comment_likes_user_idx on public.community_comment_likes (user_id, created_at desc);

alter table public.community_comment_likes enable row level security;

drop policy if exists "See own comment likes" on public.community_comment_likes;
create policy "See own comment likes" on public.community_comment_likes for select using (auth.uid() = user_id);
drop policy if exists "Like comments as yourself" on public.community_comment_likes;
create policy "Like comments as yourself" on public.community_comment_likes
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.community_comments c where c.id = comment_id and c.status = 'published')
  );
drop policy if exists "Remove own comment like" on public.community_comment_likes;
create policy "Remove own comment like" on public.community_comment_likes for delete using (auth.uid() = user_id);

create or replace function public.community_count_comment_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  target uuid := case when tg_op = 'INSERT' then new.comment_id else old.comment_id end;
  recent integer;
begin
  if tg_op = 'INSERT' and auth.uid() is not null and not public.is_moderator() then
    select count(*) into recent from public.community_comment_likes
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent > 150 then
      raise exception 'You are doing that too quickly. Please wait a little.' using errcode = 'P0001';
    end if;
  end if;
  perform set_config('community.counters', 'on', true);
  update public.community_comments set like_count = greatest(0, like_count + delta) where id = target;
  perform set_config('community.counters', '', true);
  return null;
end;
$$;

drop trigger if exists community_comment_like_counter on public.community_comment_likes;
create trigger community_comment_like_counter
  after insert or delete on public.community_comment_likes
  for each row execute function public.community_count_comment_like();

-- ───────────────────────── reports can now point at the new content ─────────────────────────

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
