// End-to-end test of ops/backup against a local stand-in for Supabase. Nothing touches production.
import { makeDb, mkUser, REPO } from "./harness.mjs";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import http from "node:http";
import { mkdtempSync, mkdirSync, cpSync, symlinkSync, readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const { runBackup, verify } = await import(`${REPO}/ops/backup/backup.mjs`);
const { buildRestore } = await import(`${REPO}/ops/backup/restore.mjs`);
const { decrypt, dbUrlFromSecret } = await import(`${REPO}/ops/backup/lib.mjs`);

let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; console.log("  ok -", m); };

// ── seed a database with realistic content ──
const db = await makeDb();
const a = await mkUser(db, "ann@test.dev");
const b = await mkUser(db, "bob@test.dev");
await db.query("update auth.users set encrypted_password='SECRET-HASH-SHOULD-NEVER-APPEAR' ");
await db.query("update public.profiles set bio='Hello — 東京 \"quoted\" $$dollar$$ \\\\ back' where id=$1", [a]);
const cat = (await db.query("select slug from public.community_categories limit 1")).rows[0].slug;
const post = await db.query(`insert into public.community_posts (user_id,title,caption,area_id,category_slug,place_ref,place_label) values ($1,'Shibuya at night','Neon $tag$ and rain 🌧','tokyo',$2,'Q1490','Shibuya') returning id`, [a, cat]);
await db.query("insert into public.community_post_images (post_id, storage_path, thumb_path, width, height) values ($1,$2,$3,800,600)", [post.rows[0].id, `${a}/p1.webp`, `${a}/p1_t.webp`]);
await db.query("insert into public.community_comments (post_id,user_id,body) values ($1,$2,'Great shot!')", [post.rows[0].id, b]);
await db.query("insert into storage.buckets (id,name,public) values ('community-photos','community-photos',true) on conflict do nothing");
const photoBytes = { [`${a}/p1.webp`]: Buffer.from("PHOTO-ONE-BYTES-\u0000ÿ"), [`${a}/p1_t.webp`]: Buffer.from("THUMB-ONE") };
for (const n of Object.keys(photoBytes)) await db.query("insert into storage.objects (bucket_id,name) values ('community-photos',$1)", [n]);

const rowsIn = async (d) => Object.fromEntries(await Promise.all(["profiles", "community_posts", "community_post_images", "community_comments", "community_settings"].map(async (t) => [t, Number((await d.query(`select count(*)::int n from public.${t}`)).rows[0].n)])));
const before = await rowsIn(db);
console.log("seeded:", before);

// ── a fake public photo address, and a postgres-protocol server in front of the database ──
const web = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.replace("/storage/v1/object/public/community-photos/", ""));
  if (photoBytes[name]) { res.writeHead(200); res.end(photoBytes[name]); } else { res.writeHead(404); res.end("no"); }
}).listen(0);
const webUrl = `http://127.0.0.1:${web.address().port}`;
const sock = new PGLiteSocketServer({ db, port: 54399, host: "127.0.0.1" });
await sock.start();
const dbUrl = "postgres://postgres:pw@127.0.0.1:54399/postgres?sslmode=disable";
process.env.LCJ_SUPABASE_URL = webUrl;
process.env.LCJ_BACKUP_QUIET = "1";

const out = mkdtempSync(join(tmpdir(), "lcj-bk-"));
const PASS = "correct horse battery staple";

console.log("\n== backup ==");
const st = await runBackup({ dbUrl, passphrase: PASS, outDir: out });
ok(st.ok && st.photos === 2, `backup ran: ${st.rows} rows, ${st.tables} tables, ${st.photos} photos`);
const files = readdirSync(out).filter((f) => f.endsWith(".lcjbk"));
ok(files.length === 1, "exactly one backup file written");
ok((statSync(join(out, files[0])).mode & 0o777) === 0o600, "file is private (mode 600)");
ok((statSync(out).mode & 0o777) === 0o700, "folder is private (mode 700)");
ok(existsSync(join(out, "status.json")), "status.json written");
const raw = readFileSync(join(out, files[0]));
ok(!raw.includes(Buffer.from("Shibuya")) && !raw.includes(Buffer.from("ann@test.dev")) && !raw.includes(Buffer.from("PHOTO-ONE")), "the file contains no readable text (encrypted)");

console.log("\n== decrypt + verify ==");
const v = verify(raw, PASS);
ok(v.counts["public.community_posts"] === 1 && v.counts["public.profiles"] === 2 && v.counts["auth.users_minimal"] === 2, "counts inside the file match the database");
const all = readFileSync(join(out, files[0]));
const plain = decrypt(all, PASS).toString("latin1");
ok(!plain.includes("SECRET-HASH"), "password hashes are not in the backup (and gzip hides nothing from this check: checked decompressed too)");
const { gunzipSync } = await import("node:zlib");
ok(!gunzipSync(decrypt(all, PASS)).toString().includes("SECRET-HASH"), "decompressed contents contain no password hash");
let threw = "";
try { decrypt(all, "wrong passphrase"); } catch (e) { threw = e.message; }
ok(/wrong passphrase|changed/i.test(threw), "wrong passphrase is refused");
const tampered = Buffer.from(all); tampered[tampered.length - 20] ^= 0x01;
threw = ""; try { verify(tampered, PASS); } catch (e) { threw = e.message; }
ok(threw !== "", "a single flipped bit is detected");
threw = ""; try { verify(all.subarray(0, all.length - 50), PASS); } catch (e) { threw = e.message; }
ok(threw !== "", "a truncated file is detected");
threw = ""; try { verify(Buffer.from("not a backup at all, just some text bytes here"), PASS); } catch (e) { threw = e.message; }
ok(/Not a LIVE CITY/.test(threw), "a random file is refused");

console.log("\n== restore into a brand-new database ==");
const r = buildRestore(all, PASS);
ok(r.sql.includes("session_replication_role") && !r.sql.includes("SECRET-HASH"), "restore.sql generated, no secrets in it");
const fresh = await makeDb();
await mkUser(fresh, "ann@test.dev"); // restore expects the accounts to exist (same ids needed)
await fresh.query("delete from auth.users"); // (reset; ids must match the backup)
for (const u of r.rows ?? []) void u;
await fresh.exec("delete from public.profiles");
for (const x of v.rows.filter((q) => q.t === "auth.users_minimal")) await fresh.query("insert into auth.users (id,email) values ($1,$2) on conflict do nothing", [x.r.id, x.r.email]);
await fresh.exec("delete from public.profiles"); // the sign-up trigger made blank profiles; the backup brings the real ones
await fresh.exec("delete from public.community_settings");
await fresh.exec(r.sql);
const after = await rowsIn(fresh);
ok(JSON.stringify(after) === JSON.stringify(before), `row counts identical after restore: ${JSON.stringify(after)}`);
const p1 = (await fresh.query("select bio from public.profiles where id=$1", [a])).rows[0].bio;
ok(p1 === 'Hello — 東京 "quoted" $$dollar$$ \\\\ back', "tricky text (quotes, $$, backslashes, Japanese) restored exactly");
const cap = (await fresh.query("select caption, search_text is not null as st from public.community_posts")).rows[0];
ok(cap.caption === "Neon $tag$ and rain 🌧", "caption with $tag$ and emoji restored exactly");
ok(r.files.length === 2 && Buffer.from(r.files[0].b64, "base64").equals(photoBytes[r.files[0].p]), "photos come back byte-for-byte");
ok(r.csv.includes("ann@test.dev") && !r.csv.includes("SECRET"), "accounts.csv lists emails only");

console.log("\n== rotation + failure behaviour ==");
process.env.LCJ_BACKUP_KEEP = "2";
for (let i = 0; i < 3; i++) { await new Promise((r) => setTimeout(r, 1100)); await runBackup({ dbUrl, passphrase: PASS, outDir: out }); }
const kept = readdirSync(out).filter((f) => f.endsWith(".lcjbk")).sort();
ok(kept.length === 2, `only the newest 2 are kept (${kept.length} on disk after 4 runs)`);
ok(JSON.parse(readFileSync(join(out, "status.json"), "utf8")).kept === 2, "status.json reports what was kept");
threw = "";
try { await runBackup({ dbUrl: "postgres://postgres:pw@127.0.0.1:1/postgres?sslmode=disable", passphrase: PASS, outDir: out }); } catch (e) { threw = e.message; }
ok(threw !== "", "an unreachable database fails loudly (no half-written file)");
ok(readdirSync(out).every((f) => !f.endsWith(".tmp")), "no temporary file left behind");

console.log("\n== hardening checks ==");
// 1. the command-line entry point must work from a folder whose name contains spaces (this project's does)
const spaced = join(mkdtempSync(join(tmpdir(), "lcj-sp ")), "my project", "ops", "backup");
mkdirSync(spaced, { recursive: true });
for (const f of ["backup.mjs", "restore.mjs", "lib.mjs", "package.json"]) cpSync(join(REPO, "ops/backup", f), join(spaced, f));
symlinkSync(join(REPO, "ops/backup/node_modules"), join(spaced, "node_modules"));
const runCli = (script, args, env) => new Promise((res) => {
  const child = spawn("node", [join(spaced, script), ...args], { env: { PATH: process.env.PATH, HOME: process.env.HOME, LCJ_BACKUP_QUIET: "1", LCJ_BACKUP_PASSPHRASE: PASS, ...env } });
  let o = "", e = "";
  child.stdout.on("data", (d) => (o += d)); child.stderr.on("data", (d) => (e += d));
  const t = setTimeout(() => child.kill(), 90000);
  child.on("close", (code) => { clearTimeout(t); res({ code, out: o, err: e }); });
});
const cliOut = mkdtempSync(join(tmpdir(), "lcj-cli-"));
const cli1 = await runCli("backup.mjs", [], { LCJ_BACKUP_DIR: cliOut, LCJ_BACKUP_DB_URL: dbUrl, LCJ_SUPABASE_URL: webUrl });
ok(cli1.code === 0 && /Backup OK/.test(cli1.out) && readdirSync(cliOut).some((f) => f.endsWith(".lcjbk")), "the command-line backup RUNS from a folder with spaces in its name (it used to do nothing, silently)");
const cli2 = await runCli("backup.mjs", [], { LCJ_BACKUP_DIR: cliOut, LCJ_BACKUP_DB_URL: dbUrl, LCJ_SUPABASE_URL: webUrl, LCJ_BACKUP_ONLY_IF_DUE_DAYS: "6" });
ok(cli2.code === 0 && /Not due/.test(cli2.out) && readdirSync(cliOut).filter((f) => f.endsWith(".lcjbk")).length === 1, "started again straight away with the 'only if due' setting, it does nothing");
// 2. the server's identity must be checked: without Supabase's certificate the tool refuses BEFORE connecting
const noCa = await runCli("backup.mjs", [], { LCJ_BACKUP_DIR: mkdtempSync(join(tmpdir(), "lcj-cli-")), LCJ_BACKUP_DB_URL: "postgres://postgres:pw@127.0.0.1:1/postgres" });
ok(noCa.code === 1 && /certificate file is missing/.test(noCa.err) && !/ECONNREFUSED/.test(noCa.err), "without Supabase's certificate it refuses before any connection is attempted");
ok(!/pw@|postgres:\/\//.test(noCa.err + noCa.out), "...and says nothing about the address or password");
// 3. a failed photo download names no person
const bad = http.createServer((q, s2) => { s2.writeHead(500); s2.end("x"); }).listen(0);
const cli3 = await runCli("backup.mjs", [], { LCJ_BACKUP_DIR: mkdtempSync(join(tmpdir(), "lcj-cli-")), LCJ_BACKUP_DB_URL: dbUrl, LCJ_SUPABASE_URL: `http://127.0.0.1:${bad.address().port}` });
ok(cli3.code === 1 && /photo 1 of 2/.test(cli3.err) && !cli3.err.includes(a), "a failed photo download reports 'photo 1 of 2', not the person's id");
bad.close();
// 4. restore: the generated SQL refuses to run on a database that already has data
const guarded = buildRestore(all, PASS).sql;
ok(/do \$guard\$/.test(guarded), "restore.sql starts with a safety check");
const live = await makeDb();
const liveUser = await mkUser(live, "live@test.dev");
await live.query("update public.profiles set bio='LIVE DATA' where id=$1", [liveUser]);
let refused = "";
try { await live.exec(guarded); } catch (e) { refused = e.message; }
await live.exec("rollback"); // (the SQL editor rolls back a script that stopped with an error; PGlite needs to be told)
ok(/already contains community data/.test(refused), "pasting restore.sql into a database that already has data is REFUSED", refused);
ok((await live.query("select bio from public.profiles where id=$1", [liveUser])).rows[0].bio === "LIVE DATA", "...and nothing in that database was changed");
ok(!/do \$guard\$/.test(buildRestore(all, PASS, { guard: false }).sql), "the guard can be left out only by asking for it explicitly");
// 5. restore refuses to write its (unencrypted) files inside a git project
const inRepo = join(REPO, "zz-restore-should-not-exist");
const rs1 = await runCli("restore.mjs", [join(cliOut, readdirSync(cliOut).find((f) => f.endsWith(".lcjbk"))), "--out", inRepo], {});
ok(rs1.code === 1 && /OUTSIDE any git project/.test(rs1.err) && !existsSync(inRepo), "restore refuses an output folder inside the project (and creates nothing)");
const safeOut = join(mkdtempSync(join(tmpdir(), "lcj-rs-")), "restored");
const rs2 = await runCli("restore.mjs", [join(cliOut, readdirSync(cliOut).find((f) => f.endsWith(".lcjbk"))), "--out", safeOut], {});
ok(rs2.code === 0 && existsSync(join(safeOut, "restore.sql")) && /NOT encrypted/.test(rs2.out), "restore works from a folder with spaces, writes outside the project, and reminds you to delete the files");
// 8. rows the migrations pre-fill (settings, categories) take the BACKUP's values on a restore into a fresh project
// (This test database has ONE shared session, so the backup tool's session-wide read-only setting is still on: switch it off for the test's own write.)
await db.exec("set session characteristics as transaction read write");
await db.query("update public.community_settings set max_posts_per_hour = 3, require_approval = true");
const cfgOut = mkdtempSync(join(tmpdir(), "lcj-cfg-"));
await runBackup({ dbUrl, passphrase: PASS, outDir: cfgOut });
const cfgFile = readFileSync(join(cfgOut, readdirSync(cfgOut).find((f) => f.endsWith(".lcjbk"))));
const freshCfg = await makeDb(); // starts with the migration's defaults (10 posts an hour, no approval)
ok((await freshCfg.query("select max_posts_per_hour m from public.community_settings")).rows[0].m === 10, "a new project starts with the migration's default settings");
await freshCfg.exec(buildRestore(cfgFile, PASS).sql);
const cfgAfter = (await freshCfg.query("select max_posts_per_hour m, require_approval r from public.community_settings")).rows[0];
ok(cfgAfter.m === 3 && cfgAfter.r === true, "after a restore the settings are the BACKUP's, not the migration defaults");
const freshKeep = await makeDb();
await freshKeep.exec(buildRestore(cfgFile, PASS, { guard: false }).sql);
ok((await freshKeep.query("select max_posts_per_hour m from public.community_settings")).rows[0].m === 10, "with the guard switched off (--allow-non-empty) rows that already exist are left alone");
// 7. the Keychain entry may be just the password: the tool builds the address itself and encodes symbols
const full = "postgresql://postgres.abc:pw@host.example:5432/postgres";
ok(dbUrlFromSecret(full) === full && dbUrlFromSecret(`  ${full}\n`) === full, "a full connection string is used exactly as given");
const built = new URL(dbUrlFromSecret("Tr1cky@P:ss/w#rd%20 x"));
ok(decodeURIComponent(built.password) === "Tr1cky@P:ss/w#rd%20 x" && built.hostname === "aws-1-ap-northeast-1.pooler.supabase.com" && decodeURIComponent(built.username) === "postgres.kmulidalmhqezaffadzc" && built.port === "5432" && built.pathname === "/postgres", "a password alone becomes the right address, with symbols safely encoded");
const ro = new URL(dbUrlFromSecret("pw", { LCJ_BACKUP_DB_USER: "supabase_read_only_user.kmulidalmhqezaffadzc", LCJ_BACKUP_DB_HOST: "h.example", LCJ_BACKUP_DB_PORT: "6543" }));
ok(ro.username.startsWith("supabase_read_only_user.") && ro.hostname === "h.example" && ro.port === "6543", "the login name, host and port can be changed (for the read-only user later)");
// 6. the encryption header cannot be tampered with
const hdr = Buffer.from(all); hdr[7] ^= 0x01; // the cost byte
let t3 = ""; try { verify(hdr, PASS); } catch (e) { t3 = e.message; }
ok(t3 !== "", "changing the encryption-cost byte in the header is detected");
ok(all.subarray(0, 7).toString() === "LCJBK2\n", "files carry the new format marker");

console.log(`\nALL ${pass} CHECKS PASSED`);
await sock.stop(); web.close(); process.exit(0);
