-- LIVE CITY JAPAN — Community: never fail a sign-up over a generated username.
--
-- Run AFTER 0003 … 0009, in the Supabase SQL editor. Safe to run more than once.
--
-- Every new account gets a generated username, "traveler_" plus the first 8 characters
-- of its id. Two accounts can (very rarely) share those 8 characters, and the second
-- sign-up would then fail with a database error. This version retries with more
-- characters of the id (12, then 15 — the most a 24-character username allows) until the
-- name is free, so a sign-up succeeds.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 8;
begin
  loop
    begin
      insert into public.profiles (id, username)
      values (new.id, 'traveler_' || substr(replace(new.id::text, '-', ''), 1, n))
      on conflict (id) do nothing;
      exit;
    exception when unique_violation then
      if n >= 15 then
        raise;
      end if;
      n := least(n + 4, 15);
    end;
  end loop;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
