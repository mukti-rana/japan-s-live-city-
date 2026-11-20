-- Undoes 0013_community_listings.sql. Run in the Supabase SQL editor ONLY if you need to remove the What's Happening listings.
-- It deletes every listing, its photographs' records and the listing categories (uploaded photo files stay in Storage), and puts the
-- reports / moderation-log rules back as they were. Reports or log entries that already point at a listing are removed first,
-- because the old rules cannot hold them.

delete from public.community_reports where target_type = 'listing';
delete from public.community_moderation_log where target_type = 'listing' or action in ('feature', 'unfeature');

alter table public.community_reports drop constraint if exists community_reports_target_type;
alter table public.community_reports
  add constraint community_reports_target_type check (target_type in ('post', 'comment', 'review', 'question', 'answer', 'user'));

alter table public.community_moderation_log drop constraint if exists community_moderation_log_target;
alter table public.community_moderation_log
  add constraint community_moderation_log_target check (target_type in ('post', 'comment', 'review', 'question', 'answer', 'user'));

alter table public.community_moderation_log drop constraint if exists community_moderation_log_action;
alter table public.community_moderation_log
  add constraint community_moderation_log_action check (action in ('hide', 'restore', 'approve', 'reject', 'delete', 'dismiss', 'reviewed', 'suspend', 'unsuspend'));

-- The reports trigger function, as it was in 0006.
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
revoke execute on function public.community_reports_before_insert() from public, anon, authenticated;

drop function if exists public.community_expire_listings();
drop function if exists public.community_listing_set_state(uuid, text, text);
drop function if exists public.community_listing_submit(uuid);
drop table if exists public.community_listing_media;
drop function if exists public.community_listing_media_before_write();
drop table if exists public.community_listings;
drop function if exists public.community_listings_before_insert();
drop function if exists public.community_listings_before_update();
drop function if exists public.community_listing_screen(text, text, text[]);
drop table if exists public.community_listing_categories;

alter table public.community_settings
  drop column if exists listings_require_approval,
  drop column if exists max_listings_per_hour,
  drop column if exists max_listing_images;
