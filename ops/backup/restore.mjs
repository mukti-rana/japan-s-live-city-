// Turns a backup file back into something you can load. It NEVER touches a database itself.
//
//   node restore.mjs <backup-file> --out <folder> [--allow-non-empty]
//
// SAFETY: the SQL it writes REFUSES to run on a database that already holds community data (it stops with a message and
// changes nothing), so pasting it into the live project by mistake does nothing. It is meant for a NEW, EMPTY project
// whose structure was created from supabase/migrations. (--allow-non-empty leaves that guard out; do not use it on live.)
// The output folder must be OUTSIDE this project folder (the files are unencrypted readable copies of the data).
//
// It reads the passphrase (LCJ_BACKUP_PASSPHRASE or the Keychain), checks the file is intact, then writes into <folder>:
//   restore.sql        data for every table, as SQL you can paste into the Supabase SQL editor of a project whose
//                      structure already exists (apply supabase/migrations first). Safe to read before running.
//   photos/<path>      every photo, under the same path it had in the bucket
//   accounts.csv       the minimal account list (for reference; passwords are not in backups)
//   summary.txt        what the file contains
import { mkdirSync, writeFileSync, readFileSync, existsSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { secret, isMain } from "./lib.mjs";
import { verify } from "./backup.mjs";

export function buildRestore(fileBuf, passphrase, { guard = true } = {}) {
  const { meta, counts, rows, files } = verify(fileBuf, passphrase);
  // Columns the database fills in itself cannot be written back; they are left out and recalculated.
  const skipColumns = new Map();
  for (const g of meta.generated) skipColumns.set(g.table_name, [...(skipColumns.get(g.table_name) ?? []), g.column_name]);
  const byTable = new Map();
  for (const { t, r } of rows) {
    if (!t.startsWith("public.")) continue;
    const name = t.slice(7);
    const row = Object.fromEntries(Object.entries(r).filter(([k]) => !(skipColumns.get(name) ?? []).includes(k)));
    byTable.set(name, [...(byTable.get(name) ?? []), row]);
  }
  const tag = `lcj${randomBytes(6).toString("hex")}`; // a dollar-quote tag that cannot clash with the data
  const sql = [
    `-- LIVE CITY JAPAN data restore, from a backup taken ${meta.at}.`,
    "-- Run in a project whose tables already exist (apply supabase/migrations first). Triggers are switched off while",
    "-- loading so counters, dates and statuses come back exactly as they were. Rows the migrations pre-fill take the backup's values.",
    "begin;",
  ];
  if (guard) {
    const watched = ["profiles", "community_posts", "community_reviews", "community_questions", "community_answers", "community_comments", "community_listings", "favorites", "user_preferences"].filter((t) => meta.tables.includes(t));
    sql.push(
      "-- SAFETY: stop (changing nothing) if this database already holds community data, so this can never be run on the live project by mistake.",
      "do $guard$ begin",
      `  if ${watched.map((t) => `exists (select 1 from public."${t}")`).join(" or ")} then`,
      "    raise exception 'This database already contains community data. Restore refused: nothing was changed. Use a new, empty project.';",
      "  end if;",
      "end $guard$;",
    );
  }
  sql.push("set local session_replication_role = replica;");
  for (const name of meta.tables) {
    const list = byTable.get(name);
    if (!list?.length) continue;
    const q = `public."${name.replace(/"/g, '""')}"`;
    // Name the columns explicitly (every row has the same ones) so the ones the database calculates are never written.
    const quote = (c) => `"${c.replace(/"/g, '""')}"`;
    const colList = Object.keys(list[0]);
    const cols = colList.map(quote).join(", ");
    // Default (guarded) mode only ever runs on an empty project, so rows the migrations pre-filled (settings, categories) take the
    // BACKUP's values. With --allow-non-empty nothing is ever replaced: rows that already exist are simply left alone.
    const pk = meta.primaryKeys?.[name];
    const nonKey = colList.filter((c) => !(pk ?? []).includes(c));
    const onConflict = guard && pk?.length && nonKey.length ? `on conflict (${pk.map(quote).join(", ")}) do update set ${nonKey.map((c) => `${quote(c)} = excluded.${quote(c)}`).join(", ")}` : "on conflict do nothing";
    sql.push(`insert into ${q} (${cols}) select ${cols} from jsonb_populate_recordset(null::${q}, $${tag}$${JSON.stringify(list)}$${tag}$::jsonb) ${onConflict};`);
  }
  sql.push("commit;", "");
  const accounts = rows.filter((x) => x.t === "auth.users_minimal").map((x) => x.r);
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["id,email,created_at,last_sign_in_at", ...accounts.map((a) => [a.id, a.email, a.created_at, a.last_sign_in_at].map(cell).join(","))].join("\n") + "\n";
  const summary = [`Backup taken: ${meta.at}`, `Tables: ${meta.tables.length}`, `Photos: ${files.length}`, ...Object.entries(counts).map(([t, n]) => `  ${t}: ${n}`), ...(meta.skipped.length ? [`Skipped: ${meta.skipped.join("; ")}`] : [])].join("\n") + "\n";
  return { sql: sql.join("\n"), files, csv, summary, meta, counts };
}

// Is this folder inside a git project (or is it where the project lives)? Restored files must never sit in one.
function insideGitProject(dir) {
  let d = dir;
  for (;;) {
    if (existsSync(join(d, ".git"))) return true;
    const up = dirname(d);
    if (up === d) return false;
    d = up;
  }
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--out");
  const outIdx = args.indexOf("--out");
  const out = outIdx >= 0 ? args[outIdx + 1] : undefined;
  if (!file || !out) {
    console.error("Usage: node restore.mjs <backup-file> --out <folder> [--allow-non-empty]");
    process.exit(2);
  }
  try {
    const dir = resolve(out);
    const nearest = existsSync(dir) ? realpathSync(dir) : dir;
    if (insideGitProject(nearest)) throw new Error("Choose a folder OUTSIDE any git project (for example ~/restore-test): these files are readable copies of the data and must never be committed or pushed.");
    const r = buildRestore(readFileSync(file), secret("LCJ_BACKUP_PASSPHRASE", "livecityjapan-backup-passphrase"), { guard: !args.includes("--allow-non-empty") });
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(join(dir, "restore.sql"), r.sql, { mode: 0o600 });
    writeFileSync(join(dir, "accounts.csv"), r.csv, { mode: 0o600 });
    writeFileSync(join(dir, "summary.txt"), r.summary);
    const photoRoot = resolve(dir, "photos");
    for (const f of r.files) {
      const target = resolve(photoRoot, f.p);
      if (!target.startsWith(photoRoot + sep)) throw new Error("Refusing an unsafe photo path in the backup.");
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, Buffer.from(f.b64, "base64"), { mode: 0o600 });
    }
    console.log(r.summary + `Written to ${dir}`);
    console.log("These files are NOT encrypted. Delete the folder when you have finished with it.");
  } catch (e) {
    console.error("Restore preparation FAILED:", e.message);
    process.exit(1);
  }
}
