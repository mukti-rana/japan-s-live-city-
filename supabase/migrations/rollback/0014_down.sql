-- Undo 0014: put the Storage rules, privileges and defaults back exactly as they were, and remove the link-limit
-- triggers. No user data is touched by 0014 or by this file.

-- D. link limits
drop trigger if exists b_community_limit_links on public.community_posts;
drop trigger if exists b_community_limit_links on public.community_reviews;
drop trigger if exists b_community_limit_links on public.community_questions;
drop trigger if exists b_community_limit_links on public.community_answers;
drop trigger if exists b_community_limit_links on public.community_comments;
drop trigger if exists b_community_limit_links on public.profiles;
drop function if exists public.community_limit_links();

-- C. privileges and defaults (as Supabase sets them: every table, to the anonymous and signed-in roles)
grant all on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

-- B + A. Storage rules exactly as in 0004
drop policy if exists "Community photos: add only server-logged photos and avatars" on storage.objects;
drop policy if exists "Community photos: owner and moderators can list" on storage.objects;
drop function if exists public.community_my_avatar_count();

drop policy if exists "Community photos are readable" on storage.objects;
create policy "Community photos are readable" on storage.objects
  for select using (bucket_id = 'community-photos');

drop policy if exists "Community photos: add to own folder" on storage.objects;
create policy "Community photos: add to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-photos' and (storage.foldername(name))[1] = auth.uid()::text);
