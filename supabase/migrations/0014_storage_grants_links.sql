-- 0014: close the photo-bucket listing, stop direct uploads from skipping the server, trim database privileges,
-- and back up the website's link limits inside the database.
--
-- NOT APPLIED. Written, tested locally and reviewed first (see supabase/migrations/rollback/0014_down.sql to undo).
-- Nothing here deletes or changes any row of user data.
--
--   A. Storage listing   Anyone could list every file name in the `community-photos` bucket (this also showed each
--                        person's id folder and files that belong to hidden posts). Now only the owner (their own
--                        folder) and moderators can list. Opening a photo by its address is NOT affected: the bucket is
--                        public, and public files are served without consulting these rules.
--   B. Direct uploads    Any signed-in person could upload straight to Storage with the public key, skipping the
--                        server's checks (real-image test, re-encoding, metadata removal) and its hourly upload limit.
--                        Now a file can only be stored if (i) the server has already logged it for that person in
--                        `community_uploads` (that insert is where the hourly limit is enforced), or (ii) it is a profile
--                        picture (`<id>/avatar_<uuid>.webp`) and the person has fewer than 3. Owner/moderator deletion is
--                        unchanged. What this cannot do: look inside a file; the bucket still only accepts <=3 MB
--                        `image/webp`, and the server remains the only place that re-encodes.
--   C. Privileges        Every public table granted ALL privileges (including TRUNCATE, TRIGGER, REFERENCES) to the
--                        anonymous and signed-in roles, so row-level security was the only barrier. Revoked: TRUNCATE,
--                        TRIGGER and REFERENCES from both roles; every write privilege from anonymous visitors; any
--                        privilege on `moderators` (only the is_moderator() function ever reads it); anonymous
--                        read access to the 13 tables that are private by design. Future tables created by this role no
--                        longer receive these grants automatically (see "New tables" below).
--   D. Links and spam    The website limits links per text (caption 2, review 2, question 2, answer 2, comment 1,
--                        bio 1) but the database did not, so a direct call could post unlimited links. Same limits,
--                        same counting rule, now enforced by a trigger. Moderators and the server (no signed-in user)
--                        are exempt, like the other guards. Updates are only checked when the text itself changes.
--
-- NEW TABLES: after this migration a new table in `public` has NO access for anon/authenticated until its migration
-- grants it explicitly, e.g.  grant select on public.x to anon, authenticated;  grant insert, update, delete on public.x
-- to authenticated;  (together with row-level security and policies). A table created without grants fails closed.
-- (Default privileges are changed only for tables/functions created by the role that runs migrations; objects created
-- by Supabase's internal roles keep Supabase's defaults.)

-- ───────────────────────── A. who can LIST the photo bucket ─────────────────────────

drop policy if exists "Community photos are readable" on storage.objects;
drop policy if exists "Community photos: owner and moderators can list" on storage.objects;
create policy "Community photos: owner and moderators can list" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'community-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_moderator())
  );

-- ───────────────────────── B. direct uploads must go through the server ─────────────────────────

-- A rule on storage.objects may not query storage.objects itself (Postgres reports "infinite recursion"), so the
-- profile-picture count lives in a tiny function. It runs with its owner's rights, counts ONLY the signed-in person's
-- own avatar files (it takes no argument, so it cannot be used to look at anyone else), and is not callable by visitors.
create or replace function public.community_my_avatar_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from storage.objects o
  where o.bucket_id = 'community-photos'
    and auth.uid() is not null
    and o.name like auth.uid()::text || '/avatar\_%';
$$;

revoke all on function public.community_my_avatar_count() from public, anon;
grant execute on function public.community_my_avatar_count() to authenticated;

drop policy if exists "Community photos: add to own folder" on storage.objects;
drop policy if exists "Community photos: add only server-logged photos and avatars" on storage.objects;
create policy "Community photos: add only server-logged photos and avatars" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      -- (i) a photo the server accepted and logged for this person first (hourly limit applies at that insert)
      exists (
        select 1 from public.community_uploads u
        where u.user_id = (select auth.uid()) and (u.path = name or u.thumb_path = name)
      )
      or
      -- (ii) a profile picture, at most 3 at a time (the server replaces the old one after saving the new one)
      (
        name ~ ('^' || (select auth.uid())::text || '/avatar_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$')
        and public.community_my_avatar_count() < 3
      )
    )
  );

-- ───────────────────────── C. database privileges ─────────────────────────

-- Never used by any feature, and not subject to row-level security (TRUNCATE).
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- Every write policy requires a signed-in person, so anonymous visitors never need to write.
revoke insert, update, delete on all tables in schema public from anon;

-- Only the is_moderator() function (which runs with its owner's rights) ever reads the moderators list.
revoke all on table public.moderators from anon, authenticated;

-- Private by design (each person sees only their own rows, or only moderators see them): no reason for an anonymous
-- visitor to hold any privilege on them.
revoke all on table
  public.community_answer_helpful,
  public.community_comment_likes,
  public.community_moderation_log,
  public.community_notification_prefs,
  public.community_notifications,
  public.community_post_likes,
  public.community_post_saves,
  public.community_reports,
  public.community_review_helpful,
  public.community_suspensions,
  public.community_uploads,
  public.favorites,
  public.user_preferences
from anon;

-- Future tables and functions start closed (see "NEW TABLES" above). Existing ones are untouched by these lines.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ───────────────────────── D. link limits inside the database ─────────────────────────

-- Counting rule identical to the website's: occurrences of "http://", "https://" or "www." (any case).
create or replace function public.community_limit_links()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  spec text;
  col text;
  max_links integer;
  label text;
  txt text;
  n integer;
begin
  if auth.uid() is null or public.is_moderator() then
    return new;
  end if;
  -- Each argument is "column:max:what-to-call-it".
  foreach spec in array tg_argv loop
    col := split_part(spec, ':', 1);
    max_links := split_part(spec, ':', 2)::integer;
    label := split_part(spec, ':', 3);
    txt := to_jsonb(new) ->> col;
    if txt is null then
      continue;
    end if;
    if tg_op = 'UPDATE' and txt is not distinct from (to_jsonb(old) ->> col) then
      continue; -- unchanged text is never re-judged
    end if;
    select count(*) into n from regexp_matches(txt, 'https?://|www\.', 'gi');
    if n > max_links then
      raise exception 'Please keep links out of the % (% at most).', label, max_links using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.community_limit_links() from public, anon, authenticated;

-- "b_" sorts after the suspension guard ("a_") and before the other guards, so a suspended or over-linked request is
-- refused before anything else is calculated.
drop trigger if exists b_community_limit_links on public.community_posts;
create trigger b_community_limit_links before insert or update on public.community_posts
  for each row execute function public.community_limit_links('caption:2:caption');

drop trigger if exists b_community_limit_links on public.community_reviews;
create trigger b_community_limit_links before insert or update on public.community_reviews
  for each row execute function public.community_limit_links('body:2:review');

drop trigger if exists b_community_limit_links on public.community_questions;
create trigger b_community_limit_links before insert or update on public.community_questions
  for each row execute function public.community_limit_links('body:2:question');

drop trigger if exists b_community_limit_links on public.community_answers;
create trigger b_community_limit_links before insert or update on public.community_answers
  for each row execute function public.community_limit_links('body:2:answer');

drop trigger if exists b_community_limit_links on public.community_comments;
create trigger b_community_limit_links before insert or update on public.community_comments
  for each row execute function public.community_limit_links('body:1:comment');

drop trigger if exists b_community_limit_links on public.profiles;
create trigger b_community_limit_links before insert or update on public.profiles
  for each row execute function public.community_limit_links('bio:1:bio');
