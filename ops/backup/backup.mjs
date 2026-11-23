// Weekly encrypted backup of LIVE CITY JAPAN's data. Run on your own Mac (see README.md); nothing leaves it.
//
//  - READ-ONLY: it connects, opens a read-only snapshot transaction and only SELECTs. It cannot change the database.
//  - Backs up the DATA of every table in the `public` schema (found automatically, so tables added later are included),
//    a minimal list of accounts (id, email, dates; NEVER password hashes) and the files in the photo bucket.
//    The structure of the database is already in git (supabase/migrations), so it is not repeated here.
//  - Writes ONE encrypted file (AES-256-GCM), checks it by decrypting it again and comparing every row count with the
//    database's own count, keeps the newest 8, and reports success or failure (macOS notification + status.json).
import pg from "pg";
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, renameSync, readdirSync, unlinkSync, chmodSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encrypt, decrypt, secret, isMain } from "./lib.mjs";

const keep = () => Math.max(1, Number(process.env.LCJ_BACKUP_KEEP ?? 8));
const BUCKET = "community-photos";
const MAX_PHOTO_BYTES = 300 * 1024 * 1024; // beyond this the photos need a different method (noted in the README)

function notify(title, text) {
  if (process.platform !== "darwin" || process.env.LCJ_BACKUP_QUIET) return;
  try {
    execFileSync("osascript", ["-e", `display notification ${JSON.stringify(text)} with title ${JSON.stringify(title)}`], { stdio: "ignore" });
  } catch {
    /* no desktop session */
  }
}

// Encrypted AND identity-checked: the connection is only made if the server proves it is Supabase, using Supabase's
// own certificate (their database uses a private certificate authority that the Mac does not know). Without the
// certificate file the tool refuses to connect, so a password is never sent to an unverified server. (sslmode=disable
// exists only for the local test database.)
function tlsConfig(mode) {
  if (mode === "disable") return false;
  const caPath = process.env.LCJ_BACKUP_CA ?? join(dirname(fileURLToPath(import.meta.url)), "supabase-ca.crt");
  if (existsSync(caPath)) return { rejectUnauthorized: true, ca: readFileSync(caPath, "utf8") };
  if (process.env.LCJ_BACKUP_ALLOW_UNVERIFIED_TLS === "1") return { rejectUnauthorized: false };
  throw new Error("Supabase's certificate file is missing, so the server's identity cannot be checked. Put it at ops/backup/supabase-ca.crt (see README, step 3b). Nothing was sent.");
}

function connectionConfig(url) {
  const u = new URL(url);
  const mode = u.searchParams.get("sslmode");
  u.searchParams.delete("sslmode");
  return { connectionString: u.toString(), ssl: tlsConfig(mode), statement_timeout: 120_000, application_name: "livecity-backup" };
}

// https://<project>.supabase.co, taken from the pooler user name "postgres.<project>" unless given explicitly.
function projectUrl(dbUrl) {
  if (process.env.LCJ_SUPABASE_URL) return process.env.LCJ_SUPABASE_URL.replace(/\/$/, "");
  const ref = decodeURIComponent(new URL(dbUrl).username).split(".")[1];
  return ref ? `https://${ref}.supabase.co` : null;
}

export async function runBackup({ dbUrl, passphrase, outDir }) {
  const client = new pg.Client(connectionConfig(dbUrl));
  await client.connect();
  // Read-only for the WHOLE connection (not just one transaction), and proven before anything is read.
  await client.query("set session characteristics as transaction read only");
  if ((await client.query("show transaction_read_only")).rows[0].transaction_read_only !== "on") {
    await client.end().catch(() => {});
    throw new Error("Safety check failed: the connection is not read-only. Nothing was read.");
  }
  const lines = [];
  const counts = {};
  const dbCounts = {};
  let photos = 0;
  let photoBytes = 0;
  let meta;
  const skipped = [];
  try {
    await client.query("begin isolation level repeatable read read only");
    const tables = (await client.query("select tablename from pg_tables where schemaname = 'public' order by 1")).rows.map((r) => r.tablename);
    // Columns the database fills in itself: they cannot be written back, so the restore tool leaves them out.
    const generated = (await client.query("select table_name, column_name from information_schema.columns where table_schema = 'public' and (is_generated = 'ALWAYS' or identity_generation = 'ALWAYS')")).rows;

    for (const t of tables) {
      const rows = (await client.query(`select to_jsonb(x) as r from public."${t.replace(/"/g, '""')}" x`)).rows;
      counts[`public.${t}`] = rows.length;
      dbCounts[`public.${t}`] = Number((await client.query(`select count(*)::bigint as n from public."${t.replace(/"/g, '""')}"`)).rows[0].n);
      for (const { r } of rows) lines.push(JSON.stringify({ t: `public.${t}`, r }));
    }

    try {
      const users = (await client.query("select id, email, created_at, last_sign_in_at from auth.users order by created_at")).rows;
      counts["auth.users_minimal"] = users.length;
      dbCounts["auth.users_minimal"] = users.length;
      for (const r of users) lines.push(JSON.stringify({ t: "auth.users_minimal", r }));
    } catch {
      skipped.push("auth.users_minimal (no permission)");
    }

    // Photos: the bucket is public, so each file is fetched from its public address.
    let names = [];
    try {
      names = (await client.query("select name from storage.objects where bucket_id = $1 order by name", [BUCKET])).rows.map((r) => r.name);
    } catch {
      skipped.push("photos (could not list the bucket)");
    }
    const base = projectUrl(dbUrl);
    if (names.length && !base) skipped.push("photos (could not work out the project address; set LCJ_SUPABASE_URL)");
    else
      for (const name of names) {
        const res = await fetch(`${base}/storage/v1/object/public/${BUCKET}/${name.split("/").map(encodeURIComponent).join("/")}`, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`Could not download photo ${photos + 1} of ${names.length} (HTTP ${res.status}).`);
        const buf = Buffer.from(await res.arrayBuffer());
        photoBytes += buf.length;
        if (photoBytes > MAX_PHOTO_BYTES) throw new Error("The photos have outgrown this simple backup (over 300 MB). See the README.");
        lines.push(JSON.stringify({ p: name, b64: buf.toString("base64") }));
        photos++;
      }
    await client.query("commit");
    meta = { v: 1, at: new Date().toISOString(), tables, counts, generated, photos, photoBytes, skipped };
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    await client.end().catch(() => {});
  }

  const body = lines.join("\n") + "\n";
  const sha = createHash("sha256").update(body).digest("hex");
  const archive = gzipSync(Buffer.from(JSON.stringify({ ...meta, sha256: sha }) + "\n" + body));
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  chmodSync(outDir, 0o700);
  const stamp = meta.at.replace(/[:]/g, "-").slice(0, 19);
  const file = join(outDir, `lcj-backup-${stamp}.lcjbk`);
  const tmp = file + ".tmp";
  try {
    writeFileSync(tmp, encrypt(archive, passphrase), { mode: 0o600 });
    // Prove the file is good BEFORE keeping it: decrypt, check the fingerprint and every count against the database.
    const check = verify(readFileSync(tmp), passphrase);
    for (const [t, n] of Object.entries(dbCounts)) if (check.counts[t] !== n) throw new Error(`Check failed: ${t} has ${n} rows in the database but ${check.counts[t]} in the backup.`);
    renameSync(tmp, file);
  } catch (e) {
    try {
      unlinkSync(tmp); // never leave a half-checked file behind
    } catch {
      /* it was never written */
    }
    throw e;
  }

  const old = readdirSync(outDir).filter((f) => /^lcj-backup-.*\.lcjbk$/.test(f)).sort().slice(0, -keep());
  for (const f of old) unlinkSync(join(outDir, f));
  const status = { ok: true, at: meta.at, file, bytes: readFileSync(file).length, rows: Object.values(counts).reduce((a, b) => a + b, 0), tables: meta.tables.length, photos, skipped, kept: Math.min(keep(), readdirSync(outDir).filter((f) => f.endsWith(".lcjbk")).length) };
  writeFileSync(join(outDir, "status.json"), JSON.stringify(status, null, 2), { mode: 0o600 });
  return status;
}

// Decrypt + parse + validate one backup file (used by the check above and by restore.mjs).
export function verify(fileBuf, passphrase) {
  const raw = gunzipSync(decrypt(fileBuf, passphrase)).toString("utf8");
  const nl = raw.indexOf("\n");
  const meta = JSON.parse(raw.slice(0, nl));
  const body = raw.slice(nl + 1);
  if (createHash("sha256").update(body).digest("hex") !== meta.sha256) throw new Error("The backup's fingerprint does not match: the file is damaged.");
  const counts = {};
  let photos = 0;
  const rows = [];
  const files = [];
  for (const line of body.split("\n")) {
    if (!line) continue;
    const o = JSON.parse(line);
    if (o.t) {
      counts[o.t] = (counts[o.t] ?? 0) + 1;
      rows.push(o);
    } else {
      photos++;
      files.push(o);
    }
  }
  for (const t of meta.tables) counts[`public.${t}`] ??= 0;
  if (meta.counts["auth.users_minimal"] !== undefined) counts["auth.users_minimal"] ??= 0;
  for (const [t, n] of Object.entries(meta.counts)) if (counts[t] !== n) throw new Error(`Backup is incomplete: ${t} should have ${n} rows but has ${counts[t]}.`);
  if (photos !== meta.photos) throw new Error("Backup is incomplete: the number of photos does not match.");
  return { meta, counts, rows, files };
}

// Only run when started from the command line.
if (isMain(import.meta.url)) {
  const outDir = process.env.LCJ_BACKUP_DIR ?? join(homedir(), "LiveCityBackups");
  // The weekly job also starts at login (in case the Mac was off at the scheduled time). It does nothing unless the
  // last good backup is older than LCJ_BACKUP_ONLY_IF_DUE_DAYS.
  const dueDays = Number(process.env.LCJ_BACKUP_ONLY_IF_DUE_DAYS ?? 0);
  if (dueDays > 0) {
    try {
      const last = JSON.parse(readFileSync(join(outDir, "status.json"), "utf8"));
      if (last.ok && Date.now() - Date.parse(last.at) < dueDays * 86_400_000) {
        console.log(`Not due: the last good backup is from ${last.at}.`);
        process.exit(0);
      }
    } catch {
      /* no earlier backup: run */
    }
  }
  try {
    const status = await runBackup({ dbUrl: secret("LCJ_BACKUP_DB_URL", "livecityjapan-supabase-db-url"), passphrase: secret("LCJ_BACKUP_PASSPHRASE", "livecityjapan-backup-passphrase"), outDir });
    console.log(`Backup OK: ${status.rows} rows in ${status.tables} tables, ${status.photos} photos, ${status.bytes} bytes -> ${status.file} (keeping ${status.kept})`);
    if (status.skipped.length) console.log("Skipped:", status.skipped.join("; "));
    notify("LIVE CITY backup", `Done: ${status.rows} rows, ${status.photos} photos.`);
  } catch (e) {
    const message = String(e.message ?? e).replace(/postgres(ql)?:\/\/\S+/gi, "[address hidden]");
    console.error("Backup FAILED:", message);
    try {
      mkdirSync(outDir, { recursive: true, mode: 0o700 });
      writeFileSync(join(outDir, "status.json"), JSON.stringify({ ok: false, at: new Date().toISOString(), error: message }, null, 2), { mode: 0o600 });
    } catch {
      /* nothing more to do */
    }
    notify("LIVE CITY backup FAILED", message.slice(0, 120));
    process.exit(1);
  }
}
