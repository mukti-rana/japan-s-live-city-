// A local stand-in for the Supabase project: PGlite (real Postgres in memory) with the roles, the auth/storage schemas
// and the default privileges Supabase sets, then every migration file applied in order. Nothing here touches production.
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "");
export const MIG = join(REPO, "supabase/migrations");

const PRELUDE = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), last_sign_in_at timestamptz, encrypted_password text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
grant usage on schema public, auth, extensions to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, metadata jsonb, created_at timestamptz default now(), unique (bucket_id, name));
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'),1)-1,0)] $$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
grant execute on all functions in schema storage to anon, authenticated, service_role;
-- what Supabase does for every new object in public (this is why production grants ALL to anon/authenticated)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export async function makeDb({ upTo = "9999", extra = [] } = {}) {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(PRELUDE);
  const files = readdirSync(MIG).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
  for (const f of files) {
    if (f.slice(0, 4) > upTo) break;
    await db.exec(readFileSync(join(MIG, f), "utf8"));
  }
  for (const f of extra) await db.exec(readFileSync(f, "utf8"));
  return db;
}

// Run as a signed-in person (or anonymous when uid is null). Rolls back when `commit` is false.
export async function as(db, uid, fn) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', true); select set_config('request.jwt.claim.role', '${uid ? "authenticated" : "anon"}', true);`);
    return await fn(db);
  } finally {
    await db.exec("rollback");
  }
}
export async function tryq(db, uid, sql, params = []) {
  try { return { ok: true, rows: (await as(db, uid, (d) => d.query(sql, params))).rows }; } catch (e) { return { ok: false, error: e.message }; }
}
export async function mkUser(db, email) {
  const r = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  return r.rows[0].id;
}
