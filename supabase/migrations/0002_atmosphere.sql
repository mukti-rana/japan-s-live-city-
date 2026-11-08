-- LIVE CITY ATMOSPHERE: remember a signed-in visitor's background choice.
--
-- Run this once in your Supabase project (SQL Editor -> New query -> paste ->
-- Run). Until it is run, the app keeps the choice in the browser only and
-- everything else works as before.
--
-- Stores {"mode": "auto|sakura|neon|autumn|fuji|matsuri|off", "intensity": "low|medium|off"}.
-- The existing row-level-security policies on user_preferences already limit
-- each user to their own row.

alter table public.user_preferences
  add column if not exists atmosphere jsonb;
