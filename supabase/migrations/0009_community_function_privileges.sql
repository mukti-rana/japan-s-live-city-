-- LIVE CITY JAPAN — Community: lock down helper functions.
--
-- Run AFTER 0003 … 0008, in the Supabase SQL editor. Safe to run more than once.
--
-- Supabase gives the public API roles (anon, authenticated) permission to run every
-- new function in the `public` schema. Most of ours are trigger functions, which cannot
-- be called directly anyway, but two are ordinary helpers that MUST stay internal:
--
--   community_notify(...)   creates a notification — callable from the API it would let
--                           anyone forge "X liked your post" messages to anyone.
--   community_wants(...)    reads someone's notification preferences.
--
-- Triggers keep working: they run inside functions owned by the database owner, which
-- keeps its permission. The functions that Row Level Security and the website call as
-- the signed-in person (is_moderator, is_suspended, community_review_stats,
-- community_profile_stats) are deliberately left callable.

revoke execute on function public.community_notify(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.community_wants(uuid, text) from public, anon, authenticated;

-- Every trigger function: not meant to be called over the API at all.
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
