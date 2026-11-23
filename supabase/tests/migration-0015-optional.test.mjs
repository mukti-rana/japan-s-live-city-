// Test of the OPTIONAL 0015 (hide client_key from anonymous visitors) on top of 0014, and its rollback.
import { makeDb, mkUser, tryq, MIG } from "./harness.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const UP = readFileSync(join(MIG, "optional/0015_hide_client_key.sql"), "utf8");
const DOWN = readFileSync(join(MIG, "optional/0015_down.sql"), "utf8");
let passed = 0, failed = 0;
const check = (c, n, x = "") => { if (c) { passed++; console.log("  ok   -", n); } else { failed++; console.log("  FAIL -", n, x); } };

const db = await makeDb(); // includes 0014
const A = await mkUser(db, "a@test.dev");
const cat = (await db.query("select slug from public.community_categories limit 1")).rows[0].slug;
await db.query(`insert into public.community_posts (user_id,title,caption,area_id,category_slug,place_ref,place_label,client_key) values ($1,'Shibuya','Neon','tokyo',$2,'Q1490','Shibuya','11111111-1111-4111-8111-111111111111')`, [A, cat]);
await db.query("insert into public.community_listings (user_id,kind,status,title,summary,area_id,city_label,client_key) values ($1,'event','published','Cherry blossom picnic','Bring a blanket','tokyo','Tokyo','22222222-2222-4222-8222-222222222222')", [A]);

const cols = (await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='community_posts' and column_name <> 'client_key' order by ordinal_position")).rows.map((r) => r.column_name).join(",");
const anonRead = (t, sel) => tryq(db, null, `select ${sel} from public.${t} limit 1`);

check((await anonRead("community_posts", "client_key")).ok, "before: an anonymous visitor can read client_key (posts)");
await db.exec(UP);
check(true, "optional migration applies");
await db.exec(UP);
check(true, "...and re-applies");
check(!(await anonRead("community_posts", "client_key")).ok, "after: anonymous visitor cannot read client_key (posts)");
check(!(await anonRead("community_listings", "client_key")).ok, "after: anonymous visitor cannot read client_key (listings)");
check((await anonRead("community_posts", cols)).ok && (await anonRead("community_posts", cols)).rows.length === 1, "after: every other column is still readable (explicit list, as the pages do)");
check((await anonRead("community_posts", "id,title,caption,search_text")).ok, "after: search_text stays readable");
check((await tryq(db, null, "select id from public.community_posts where search_text ilike '%shibuya%'")).rows.length === 1, "after: the public search filter still works");
check(!(await anonRead("community_posts", "*")).ok, "documented cost: an anonymous select * is refused (the health endpoint must list a column)");
check((await tryq(db, A, "select client_key from public.community_posts where user_id=$1 and client_key='11111111-1111-4111-8111-111111111111'", [A])).rows.length === 1, "a signed-in person still finds their own client_key (duplicate-press protection keeps working)");
check((await tryq(db, A, `insert into public.community_posts (user_id,title,caption,area_id,category_slug,place_ref,place_label,client_key) values ($1,'Second','x','tokyo',$2,'Q1490','x','33333333-3333-4333-8333-333333333333') returning id`, [A, cat])).ok, "a signed-in person can still publish");
await db.exec(DOWN);
check((await anonRead("community_posts", "client_key")).ok && (await anonRead("community_listings", "*")).ok, "after the rollback: anonymous reading is exactly as before (even select *)");
await db.exec(DOWN);
check(true, "the rollback is safe to run twice");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
