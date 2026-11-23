// Local test of migration 0014 (+ its rollback) on a faithful stand-in for the production database
// (same 94 policies / 41 triggers / 30 tables / 46 functions / default privileges). Nothing here touches production.
import { makeDb, mkUser, as, tryq, MIG } from "./harness.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const UP = readFileSync(join(MIG, "0014_storage_grants_links.sql"), "utf8");
const DOWN = readFileSync(join(MIG, "rollback/0014_down.sql"), "utf8");

let passed = 0, failed = 0;
const check = (cond, name, extra = "") => { if (cond) { passed++; console.log("  ok   -", name); } else { failed++; console.log("  FAIL -", name, extra); } };

// ── a database like production just before the migration (0001..0013) ──
const db = await makeDb({ upTo: "0013" });
const A = await mkUser(db, "a@test.dev"), B = await mkUser(db, "b@test.dev"), M = await mkUser(db, "m@test.dev");
await db.query("insert into public.moderators (user_id) values ($1)", [M]);
const cat = (await db.query("select slug from public.community_categories limit 1")).rows[0].slug;
const post = (await db.query(`insert into public.community_posts (user_id,title,caption,area_id,category_slug,place_ref,place_label) values ($1,'Shibuya at night','Neon lights','tokyo',$2,'Q1490','Shibuya') returning id`, [A, cat])).rows[0].id;
await db.query("insert into public.community_post_images (post_id,storage_path,thumb_path,width,height) values ($1,$2,$3,800,600)", [post, `${A}/p.webp`, `${A}/p_t.webp`]);
await db.query("insert into public.community_comments (post_id,user_id,body) values ($1,$2,'Great shot!')", [post, B]); // notifies A
await db.query("insert into public.community_reviews (user_id,place_ref,place_name,rating,body,area_id,recommend) values ($1,'Q1490','Shibuya',5,'Lovely','tokyo',true)", [A]);
const q = (await db.query("insert into public.community_questions (user_id,title,body,area_id,place_ref) values ($1,'Best ramen nearby?','Looking for ideas','tokyo','Q1490') returning id", [B])).rows[0].id;
await db.query("insert into public.community_answers (question_id,user_id,body) values ($1,$2,'Try the shop by the station')", [q, A]);
await db.query("insert into public.community_listings (user_id,kind,status,title,summary,area_id,city_label) values ($1,'event','published','Cherry blossom picnic','Bring a blanket','tokyo','Tokyo')", [A]);
await db.query("update public.profiles set show_visited = true where id=$1", [A]);
await db.query("insert into public.community_visited (user_id,place_ref,area_id) values ($1,'Q1490','tokyo')", [A]);
await db.query("insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('community-photos','community-photos',true,3145728,array['image/webp']) on conflict do nothing");
await db.query("insert into public.community_uploads (user_id,path,thumb_path,width,height) values ($1,$2,$3,800,600)", [A, `${A}/p.webp`, `${A}/p_t.webp`]);
await db.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1),('community-photos',$2),('community-photos',$3)", [`${A}/p.webp`, `${A}/p_t.webp`, `${B}/b1.webp`]);

// ── what the website does, as each kind of visitor: it must behave the same before and after ──
async function suite() {
  const r = {};
  const t = async (name, fn) => { try { r[name] = await fn(); } catch (e) { r[name] = `ERROR ${e.message}`; } };
  const rows = async (uid, sql, p = []) => { const x = await tryq(db, uid, sql, p); return x.ok ? x.rows.length : `ERROR ${x.error}`; };
  // anonymous visitor (public pages)
  for (const [n, sql] of [
    ["posts", "select id,title,caption,search_text from public.community_posts where status='published'"],
    ["posts search", "select id from public.community_posts where search_text ilike '%shibuya%'"],
    ["post images", "select * from public.community_post_images"],
    ["comments", "select * from public.community_comments"],
    ["reviews", "select * from public.community_reviews"],
    ["questions", "select * from public.community_questions"],
    ["answers", "select * from public.community_answers"],
    ["categories", "select * from public.community_categories"],
    ["listing categories", "select * from public.community_listing_categories"],
    ["places", "select * from public.community_places"],
    ["settings", "select * from public.community_settings"],
    ["listings", "select * from public.community_listings where status='published'"],
    ["listing media", "select * from public.community_listing_media"],
    ["profiles", "select id,username,display_name,avatar_url,bio from public.profiles"],
    ["visited (shared)", "select * from public.community_visited"],
  ]) await t(`anon reads ${n}`, () => rows(null, sql));
  await t("anon profile_stats()", () => rows(null, "select * from public.community_profile_stats($1)", [A]));
  await t("anon review_stats()", () => rows(null, "select * from public.community_review_stats('Q1490')"));
  await t("anon is_moderator()", async () => JSON.stringify((await tryq(db, null, "select public.is_moderator() as m")).rows));
  await t("anon is_suspended()", async () => JSON.stringify((await tryq(db, null, "select public.is_suspended() as s")).rows));
  // signed-in person
  await t("A reads own favorites/preferences/notifications", async () => [await rows(A, "select * from public.favorites"), await rows(A, "select * from public.user_preferences"), await rows(A, "select * from public.community_notifications")].join(","));
  await t("A sees a notification from B's comment", () => rows(A, "select * from public.community_notifications"));
  await t("A adds a favorite", async () => (await tryq(db, A, "insert into public.favorites (kind,key) values ('city','tokyo') returning id")).ok);
  await t("A sets a preference", async () => (await tryq(db, A, "insert into public.user_preferences (language) values ('ja') returning user_id")).ok);
  await t("A posts (status is forced by the guard)", async () => { const x = await tryq(db, A, `insert into public.community_posts (user_id,title,caption,area_id,category_slug,place_ref,place_label,status,like_count) values ($1,'Hello world','Two links https://a.example and www.b.example','tokyo',$2,'Q1490','Shibuya','hidden',99) returning status,like_count`, [A, cat]); return x.ok ? JSON.stringify(x.rows) : x.error; });
  await t("B comments on A's post", async () => (await tryq(db, B, "insert into public.community_comments (post_id,user_id,body) values ($1,$2,'Nice') returning id", [post, B])).ok);
  await t("B likes and saves A's post", async () => [(await tryq(db, B, "insert into public.community_post_likes (post_id,user_id) values ($1,$2) returning post_id", [post, B])).ok, (await tryq(db, B, "insert into public.community_post_saves (post_id,user_id) values ($1,$2) returning post_id", [post, B])).ok].join(","));
  await t("B reports A's post", async () => (await tryq(db, B, "insert into public.community_reports (reporter_id,target_type,target_id,reason) values ($1,'post',$2,'spam') returning id", [B, post])).ok);
  await t("A edits own bio", async () => (await tryq(db, A, "update public.profiles set bio='Hello from Tokyo' where id=$1 returning id", [A])).ok);
  await t("A cannot edit B's profile", async () => (await tryq(db, A, "update public.profiles set bio='hacked' where id=$1 returning id", [B])).rows?.length ?? 0);
  await t("A logs an upload + stores it + removes it (the server's flow)", async () => {
    const ok = await as(db, A, async (d) => {
      const id = "11111111-1111-4111-8111-111111111111";
      await d.query("insert into public.community_uploads (user_id,path,thumb_path,width,height) values ($1,$2,$3,800,600)", [A, `${A}/${id}.webp`, `${A}/${id}_t.webp`]);
      const ins = await d.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1) returning name", [`${A}/${id}.webp`]);
      const del = await d.query("delete from storage.objects where bucket_id='community-photos' and name = $1 returning name", [`${A}/${id}.webp`]);
      return [ins.rows.length, del.rows.length].join(",");
    }).catch((e) => `ERROR ${e.message}`);
    return ok;
  });
  await t("A replaces a profile picture (avatar upload, then delete old)", async () => {
    return await as(db, A, async (d) => {
      const f = (n) => `${A}/avatar_${n}-0000-4000-8000-000000000000.webp`;
      await d.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1)", [f("aaaaaaaa")]);
      await d.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1)", [f("bbbbbbbb")]);
      const del = await d.query("delete from storage.objects where bucket_id='community-photos' and name=$1 returning name", [f("aaaaaaaa")]);
      return String(del.rows.length);
    }).catch((e) => `ERROR ${e.message}`);
  });
  await t("A deletes own photo; cannot delete B's", async () => as(db, A, async (d) => [(await d.query("delete from storage.objects where bucket_id='community-photos' and name=$1 returning name", [`${A}/p.webp`])).rows.length, (await d.query("delete from storage.objects where bucket_id='community-photos' and name=$1 returning name", [`${B}/b1.webp`])).rows.length].join(",")));
  // moderator
  await t("M is_moderator()", async () => JSON.stringify((await tryq(db, M, "select public.is_moderator() as m")).rows));
  await t("M hides A's post", async () => { const x = await tryq(db, M, "update public.community_posts set status='hidden' where id=$1 returning status", [post]); return x.ok ? JSON.stringify(x.rows) : x.error; });
  await t("M deletes B's photo (moderation)", async () => as(db, M, async (d) => String((await d.query("delete from storage.objects where bucket_id='community-photos' and name=$1 returning name", [`${B}/b1.webp`])).rows.length)));
  await t("M writes the moderation log + suspends B", async () => [(await tryq(db, M, "insert into public.community_moderation_log (moderator_id,action,target_type,target_id) values ($1,'hide','post',$2) returning id", [M, post])).ok, (await tryq(db, M, "insert into public.community_suspensions (user_id,suspended_by) values ($1,$2) returning user_id", [B, M])).ok].join(","));
  await t("M reads all photo rows", () => rows(M, "select name from storage.objects where bucket_id='community-photos'"));
  // service role (the backup/maintenance path) keeps everything
  await t("service_role reads moderators", async () => { await db.exec("set role service_role"); try { return String((await db.query("select count(*)::int n from public.moderators")).rows[0].n); } finally { await db.exec("reset role"); } });
  return r;
}

async function snapshot() {
  const q = async (sql) => JSON.stringify((await db.query(sql)).rows);
  return {
    policies: await q("select tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname in ('public','storage') order by 1,2"),
    grants: await q("select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role') order by 1,2,3"),
    defaults: await q("select defaclrole::regrole::text r, defaclnamespace::regnamespace::text n, defaclobjtype t, defaclacl::text a from pg_default_acl where defaclnamespace::regnamespace::text='public' order by 1,2,3"),
    triggers: await q("select c.relname, t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and not t.tgisinternal order by 1,2"),
    functions: await q("select proname from pg_proc where pronamespace='public'::regnamespace order by 1"),
  };
}

console.log("== BEFORE: the website's behaviour on the current rules ==");
const snap0 = await snapshot();
const before = await suite();
const beforeFail = Object.entries(before).filter(([, v]) => typeof v === "string" && v.startsWith("ERROR"));
check(beforeFail.length === 0, `every scenario runs on the current rules (${Object.keys(before).length} scenarios)`, JSON.stringify(beforeFail));
// documented current weaknesses (these are what the migration closes)
const listBefore = (await tryq(db, null, "select name from storage.objects where bucket_id='community-photos'")).rows.length;
check(listBefore >= 3, `current rules: an anonymous visitor can list ${listBefore} photo file names (the leak)`);
const directBefore = await as(db, A, async (d) => (await d.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1) returning name", [`${A}/never-logged.webp`])).rows.length).catch((e) => e.message);
check(directBefore === 1, "current rules: a signed-in person can store a file the server never logged (the bypass)");
const trBefore = await tryq(db, A, "truncate public.favorites");
check(trBefore.ok, "current rules: a signed-in role holds TRUNCATE (the over-grant)");

console.log("\n== APPLY the migration ==");
await db.exec(UP);
check(true, "migration applies without error");
await db.exec(UP);
check(true, "applying it a second time also works (safe to re-run)");

console.log("\n== AFTER: every website scenario behaves the same ==");
const after = await suite();
for (const [name, v] of Object.entries(before)) {
  const same = JSON.stringify(v) === JSON.stringify(after[name]);
  check(same, name, same ? "" : `before=${JSON.stringify(v)} after=${JSON.stringify(after[name])}`);
}

console.log("\n== A. who can list the photo bucket ==");
check((await tryq(db, null, "select name from storage.objects where bucket_id='community-photos'")).rows.length === 0, "anonymous visitor lists 0 files");
check((await tryq(db, A, "select name from storage.objects where bucket_id='community-photos'")).rows.every((r) => r.name.startsWith(A + "/")), "a signed-in person lists only their own folder");
check((await tryq(db, B, "select name from storage.objects where name like $1", [`${A}/%`])).rows.length === 0, "B cannot see A's files");
check((await tryq(db, M, "select name from storage.objects where bucket_id='community-photos'")).rows.length >= 3, "a moderator can list everything");

console.log("\n== B. direct uploads ==");
const ins = (uid, name) => as(db, uid, async (d) => { try { return (await d.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1) returning name", [name])).rows.length; } catch (e) { return `refused: ${e.message.slice(0, 60)}`; } });
check(String(await ins(A, `${A}/never-logged.webp`)).startsWith("refused"), "a file the server never logged is refused");
check(String(await ins(A, `${B}/b-file.webp`)).startsWith("refused"), "writing into someone else's folder is refused");
check(String(await ins(B, `${B}/${"x".repeat(5)}.webp`)).startsWith("refused"), "an unlogged name in your own folder is refused");
check((await as(db, B, async (d) => { await d.query("insert into public.community_uploads (user_id,path,thumb_path,width,height) values ($1,$2,$3,800,600)", [B, `${B}/z.webp`, `${B}/z_t.webp`]); const a = await d.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1) returning name", [`${B}/z.webp`]); const b = await d.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1) returning name", [`${B}/z_t.webp`]); return a.rows.length + b.rows.length; })) === 2, "a logged photo and its thumbnail are accepted");
check(String(await as(db, B, async (d) => { await d.query("insert into public.community_uploads (user_id,path,thumb_path,width,height) values ($1,$2,$3,800,600)", [A, `${A}/stolen.webp`, `${A}/stolen_t.webp`]); return "inserted"; }).catch((e) => `refused: ${e.message.slice(0, 50)}`)).startsWith("refused"), "B cannot log an upload in A's name (so cannot unlock A's folder)");
const avatars = await as(db, B, async (d) => {
  const out = [];
  for (let i = 1; i <= 4; i++) {
    const n = `${B}/avatar_${String(i).repeat(8)}-0000-4000-8000-000000000000.webp`;
    try { await d.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1)", [n]); out.push("ok"); } catch { out.push("refused"); }
  }
  // (a failed statement aborts the transaction in Postgres; so run each in its own savepoint below instead)
  return out;
}).catch(() => null);
const avatars2 = [];
for (let i = 1; i <= 4; i++) {
  const n = `${B}/avatar_${String(i).repeat(8)}-0000-4000-8000-000000000000.webp`;
  avatars2.push(await ins(B, n));
}
void avatars;
check(avatars2.every((v) => v === 1), "profile pictures: each one is accepted when fewer than 3 exist (independent transactions)");
const avatars3 = await as(db, B, async (d) => {
  const res = [];
  for (let i = 1; i <= 4; i++) {
    const n = `${B}/avatar_${String(i).repeat(8)}-0000-4000-8000-000000000000.webp`;
    await d.query("savepoint s");
    try { await d.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1)", [n]); res.push("ok"); await d.query("release savepoint s"); } catch { res.push("refused"); await d.query("rollback to savepoint s"); }
  }
  return res.join(",");
});
check(avatars3 === "ok,ok,ok,refused", `a 4th profile picture is refused (got ${avatars3})`);
check(String(await ins(B, `${B}/avatar_notauuid.webp`)).startsWith("refused"), "an avatar-looking name that is not an avatar name is refused");
check(String(await ins(B, `${B}/avatar_11111111-0000-4000-8000-000000000000.png`)).startsWith("refused"), "wrong extension refused");
check(String(await ins(null, `${A}/anon.webp`)).startsWith("refused"), "an anonymous visitor cannot upload");

console.log("\n== C. privileges ==");
const denied = async (uid, sql) => { const x = await tryq(db, uid, sql); return !x.ok && /permission denied/i.test(x.error); };
check(await denied(A, "truncate public.favorites"), "signed-in role can no longer TRUNCATE");
check(await denied(null, "insert into public.favorites (user_id,kind,key) values (gen_random_uuid(),'city','x')"), "anonymous visitor can no longer write at all");
check(await denied(null, "select * from public.community_reports"), "anonymous visitor cannot touch a private table (clear refusal, not just empty)");
check(await denied(null, "select * from public.moderators") && await denied(A, "select * from public.moderators"), "nobody can read the moderators table directly");
check((await tryq(db, M, "select public.is_moderator() m")).rows[0].m === true && (await tryq(db, A, "select public.is_moderator() m")).rows[0].m === false, "is_moderator() still works for everyone");
const privs = (await db.query("select count(*)::int n from information_schema.role_table_grants where table_schema='public' and grantee='anon' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES')")).rows[0].n;
check(privs === 0, "anonymous role holds no write/truncate/trigger/references privilege anywhere");
const authPrivs = (await db.query("select count(*)::int n from information_schema.role_table_grants where table_schema='public' and grantee='authenticated' and privilege_type in ('TRUNCATE','TRIGGER','REFERENCES')")).rows[0].n;
check(authPrivs === 0, "signed-in role holds no truncate/trigger/references privilege anywhere");
// a table created afterwards starts closed
await db.exec("create table public.zz_future (id int)");
check((await tryq(db, A, "select * from public.zz_future")).ok === false, "a table created after the migration is closed by default (fails safe)");
await db.exec("drop table public.zz_future");

console.log("\n== D. link limits ==");
const post1 = (links, uid = A) => tryq(db, uid, `insert into public.community_posts (user_id,title,caption,area_id,category_slug,place_ref,place_label) values ($1,'Link test','${links}','tokyo',$2,'Q1490','Shibuya') returning id`, [uid, cat]);
check((await post1("see https://a.example and https://b.example")).ok, "a post with 2 links is accepted (same as the website)");
const three = await post1("https://a.example https://b.example https://c.example");
check(!three.ok && /keep links out of the caption \(2 at most\)/.test(three.error), "a post with 3 links is refused with the website's wording", three.error);
check(!(await post1("WWW.A.COM HTTP://B.COM www.c.com")).ok, "counting is case-insensitive like the website");
check((await post1("no links at all, just words about 東京")).ok, "plain text is fine");
const cmt = (body) => tryq(db, B, "insert into public.community_comments (post_id,user_id,body) values ($1,$2,$3) returning id", [post, B, body]);
check((await cmt("one https://a.example link")).ok && !(await cmt("two https://a.example and www.b.example")).ok, "comments: 1 link ok, 2 refused");
check((await tryq(db, A, "update public.profiles set bio='my site https://a.example' where id=$1 returning id", [A])).ok && !(await tryq(db, A, "update public.profiles set bio='https://a.example www.b.example' where id=$1 returning id", [A])).ok, "bio: 1 link ok, 2 refused");
check(!(await tryq(db, B, "insert into public.community_questions (user_id,title,body,area_id,place_ref) values ($1,'Question here','https://a https://b https://c','tokyo','Q1490') returning id", [B])).ok, "questions: 3 links refused");
check(!(await tryq(db, A, "insert into public.community_answers (question_id,user_id,body) values ($1,$2,'answer text https://a https://b https://c') returning id", [q, A])).ok, "answers: 3 links refused");
check(!(await tryq(db, A, "insert into public.community_reviews (user_id,place_ref,place_name,rating,body,area_id,recommend) values ($1,'Q1491','X',4,'https://a https://b https://c','tokyo',true) returning id", [A])).ok, "reviews: 3 links refused");
// an old row that already has too many links can still be edited in OTHER ways, and re-saved unchanged
await db.exec("alter table public.community_posts disable trigger b_community_limit_links");
const legacy = (await db.query(`insert into public.community_posts (user_id,title,caption,area_id,category_slug,place_ref,place_label) values ($1,'Legacy','https://1 https://2 https://3 https://4','tokyo',$2,'Q1490','Shibuya') returning id`, [A, cat])).rows[0].id;
await db.exec("alter table public.community_posts enable trigger b_community_limit_links");
check((await tryq(db, A, "update public.community_posts set place_label='Shibuya crossing' where id=$1 returning id", [legacy])).ok, "an existing over-limit post can still be edited when its text does not change");
check(!(await tryq(db, A, "update public.community_posts set caption='https://1 https://2 https://3 https://4 https://5' where id=$1 returning id", [legacy])).ok, "...but rewriting the text with too many links is refused");
// exemptions
check((await db.query(`insert into public.community_posts (user_id,title,caption,area_id,category_slug,place_ref,place_label) values ($1,'Server','https://1 https://2 https://3','tokyo',$2,'Q1490','x') returning id`, [A, cat])).rows.length === 1, "the server (no signed-in person) is exempt");
check((await tryq(db, M, `insert into public.community_posts (user_id,title,caption,area_id,category_slug,place_ref,place_label) values ($1,'Mod','https://1 https://2 https://3','tokyo',$2,'Q1490','x') returning id`, [M, cat])).ok, "moderators are exempt");
// the database counts exactly like the website's JavaScript
const js = (s) => (s.match(/https?:\/\/|www\./gi) ?? []).length;
let parity = true;
for (const s of ["", "none", "http://a", "HTTPS://A", "www.x www.y", "xwww.y", "wwwx", "a https://b http://c www.d", "https:/ /broken", "see:https://a.example,https://b.example.", "日本語 https://東京.jp"]) {
  const sql = Number((await db.query("select count(*)::int n from regexp_matches($1,'https?://|www\\.','gi')", [s])).rows[0].n);
  if (sql !== js(s)) { parity = false; console.log("   mismatch for", JSON.stringify(s), sql, js(s)); }
}
check(parity, "the database's link count equals the website's for 11 tricky strings");

console.log("\n== ROLLBACK ==");
await db.exec(DOWN);
const snap1 = await snapshot();
for (const k of Object.keys(snap0)) check(snap0[k] === snap1[k], `after the rollback, ${k} are exactly as before the migration`);
const listAfterRb = (await tryq(db, null, "select name from storage.objects where bucket_id='community-photos'")).rows.length;
check(listAfterRb >= 3, "after the rollback, the old behaviour is back (anonymous listing works again, as it did)");
await db.exec(DOWN);
check(true, "the rollback is also safe to run twice");
await db.exec(UP);
check(true, "and the migration can be re-applied after a rollback");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
