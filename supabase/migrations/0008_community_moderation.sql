-- LIVE CITY JAPAN — Community, phase 6: moderation.
--
-- Run AFTER 0003 … 0007, in the Supabase SQL editor.
-- Safe to run more than once; it never drops or rewrites existing content.
--
-- What this adds:
--   * community_suspensions        people who may not post for a while (or until lifted)
--   * is_suspended()               true for the signed-in person while a suspension applies
--   * a "blocked while suspended" check on every table where people create content
--   * community_moderation_log     a record of every moderator action (who, what, when, why)
--
-- Moderators are still only the people listed in `moderators` (editable only from
-- this SQL editor). Nothing here uses a service-role key: moderators act through
-- their own signed-in session and the Row Level Security rules already written for
-- every table (moderators can read and change status on all community content).
--
-- To make someone a moderator (run once, with their real user id):
--   insert into public.moderators (user_id) values ('<their auth.users id>');

-- ───────────────────────── suspensions ─────────────────────────

create table if not exists public.community_suspensions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null default '',
  suspended_by uuid references auth.users(id) on delete set null,
  suspended_at timestamptz not null default now(),
  -- null = until a moderator lifts it
  until timestamptz,
  constraint community_suspensions_reason_len check (char_length(reason) <= 500)
);

alter table public.community_suspensions enable row level security;

-- You can see your own suspension (so the site can explain it); moderators see all.
drop policy if exists "See own suspension or moderate" on public.community_suspensions;
create policy "See own suspension or moderate" on public.community_suspensions
  for select using (auth.uid() = user_id or public.is_moderator());

drop policy if exists "Moderators suspend" on public.community_suspensions;
create policy "Moderators suspend" on public.community_suspensions
  for insert with check (public.is_moderator() and suspended_by = auth.uid());

drop policy if exists "Moderators change suspensions" on public.community_suspensions;
create policy "Moderators change suspensions" on public.community_suspensions
  for update using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists "Moderators lift suspensions" on public.community_suspensions;
create policy "Moderators lift suspensions" on public.community_suspensions
  for delete using (public.is_moderator());

-- A moderator cannot suspend another moderator (or themselves).
create or replace function public.community_suspensions_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.moderators where user_id = new.user_id) then
    raise exception 'A moderator cannot be suspended.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists community_suspensions_guard on public.community_suspensions;
create trigger community_suspensions_guard
  before insert or update on public.community_suspensions
  for each row execute function public.community_suspensions_guard();

create or replace function public.is_suspended()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_suspensions s
    where s.user_id = auth.uid() and (s.until is null or s.until > now())
  );
$$;

revoke all on function public.is_suspended() from public;
grant execute on function public.is_suspended() to anon, authenticated;

-- ───────────────────────── block content while suspended ─────────────────────────

-- Runs before anything new is created. Named with a leading "a" so it runs before
-- the other before-insert checks and the person gets this message first.
create or replace function public.community_block_suspended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_moderator() and public.is_suspended() then
    raise exception 'Your account is suspended from posting in the community for now.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['community_posts', 'community_reviews', 'community_questions', 'community_answers', 'community_comments', 'community_uploads']
  loop
    execute format('drop trigger if exists a_community_block_suspended on public.%I', t);
    execute format('create trigger a_community_block_suspended before insert on public.%I for each row execute function public.community_block_suspended()', t);
  end loop;
end $$;

-- ───────────────────────── moderation log ─────────────────────────

create table if not exists public.community_moderation_log (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint community_moderation_log_action check (action in ('hide', 'restore', 'approve', 'reject', 'delete', 'dismiss', 'reviewed', 'suspend', 'unsuspend')),
  constraint community_moderation_log_target check (target_type in ('post', 'comment', 'review', 'question', 'answer', 'user')),
  constraint community_moderation_log_note_len check (char_length(note) <= 500)
);

create index if not exists community_moderation_log_recent_idx on public.community_moderation_log (created_at desc);

alter table public.community_moderation_log enable row level security;

drop policy if exists "Moderators read the log" on public.community_moderation_log;
create policy "Moderators read the log" on public.community_moderation_log
  for select using (public.is_moderator());

-- Entries are added as yourself and can never be changed or removed afterwards
-- (no update or delete policy exists).
drop policy if exists "Moderators write the log" on public.community_moderation_log;
create policy "Moderators write the log" on public.community_moderation_log
  for insert with check (public.is_moderator() and moderator_id = auth.uid());
