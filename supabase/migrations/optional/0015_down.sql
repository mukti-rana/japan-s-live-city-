-- Undo the optional 0015: anonymous visitors can read every column of posts and listings again, as before.
-- (Revoking the per-column grants first keeps the privilege table tidy; then the table-level grant is restored.)
revoke select on public.community_posts from anon;
revoke select on public.community_listings from anon;
grant select on public.community_posts to anon;
grant select on public.community_listings to anon;
