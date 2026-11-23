-- OPTIONAL, NOT PART OF 0014, NOT APPLIED. Hides the `client_key` column of posts and listings from ANONYMOUS visitors.
--
-- What client_key is: a random token the browser generates for each "publish" press so a retry cannot create a duplicate
-- post. Only its owner ever reads it back (the server looks it up for the signed-in person's own rows). Anyone can
-- currently read it for every post, but it reveals nothing about anyone: it is random and only meaningful together with
-- the author's id. Hiding it is hygiene, not a fix for an exploitable problem.
--
-- Why it is a separate, optional file, and the cost:
--   * Column-level privileges are all-or-nothing per role: to hide ONE column from anonymous visitors the table-level
--     SELECT is replaced by SELECT on every OTHER column. After this, an anonymous "select *" on posts/listings is refused
--     ("permission denied"); only explicit column lists work. The website's pages already list their columns, but the
--     health endpoint (src/app/api/community/status/route.ts) runs select("*") on community_posts and WOULD report a
--     failure: change it to select a column first (e.g. "id"). Apply this only after that code is live.
--   * Every column added to these tables later must be granted to `anon` explicitly in its own migration, or anonymous
--     pages that select it will fail (it fails closed, which is safe but visible).
--   * Signed-in people keep full access (RLS already limits what rows they can see); this protects only against anonymous
--     reading.
-- NOT changed: `search_text` (a lowercase copy of the post's own public text). The public search filters on it, and a
-- filter needs read access to the column, so it must stay readable.

do $$
declare
  t text;
  cols text;
begin
  foreach t in array array['community_posts', 'community_listings'] loop
    select string_agg(format('%I', column_name), ', ' order by ordinal_position)
      into cols
      from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name <> 'client_key';
    execute format('revoke select on public.%I from anon', t);
    execute format('grant select (%s) on public.%I to anon', cols, t);
  end loop;
end
$$;
