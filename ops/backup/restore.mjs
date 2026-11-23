// Turns a backup file back into something you can load. It NEVER touches a database itself.
//
//   node restore.mjs <backup-file> --out <folder>
//
// It reads the passphrase (LCJ_BACKUP_PASSPHRASE or the Keychain), checks the file is intact, then writes into <folder>:
//   restore.sql        data for every table, as SQL you can paste into the Supabase SQL editor of a project whose
//                      structure already exists (apply supabase/migrations first). Safe to read before running.
//   photos/<path>      every photo, under the same path it had in the bucket
//   accounts.csv       the minimal account list (for reference; passwords are not in backups)
//   summary.txt        what the file contains
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { secret } from "./lib.mjs";
import { verify } from "./backup.mjs";

export function buildRestore(fileBuf, passphrase) {
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
    "-- loading so counters, dates and statuses come back exactly as they were; rows that already exist are left alone.",
    "begin;",
    "set local session_replication_role = replica;",
  ];
  for (const name of meta.tables) {
    const list = byTable.get(name);
    if (!list?.length) continue;
    const q = `public."${name.replace(/"/g, '""')}"`;
    // Name the columns explicitly (every row has the same ones) so the ones the database calculates are never written.
    const cols = Object.keys(list[0]).map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");
    sql.push(`insert into ${q} (${cols}) select ${cols} from jsonb_populate_recordset(null::${q}, $${tag}$${JSON.stringify(list)}$${tag}$::jsonb) on conflict do nothing;`);
  }
  sql.push("commit;", "");
  const accounts = rows.filter((x) => x.t === "auth.users_minimal").map((x) => x.r);
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["id,email,created_at,last_sign_in_at", ...accounts.map((a) => [a.id, a.email, a.created_at, a.last_sign_in_at].map(cell).join(","))].join("\n") + "\n";
  const summary = [`Backup taken: ${meta.at}`, `Tables: ${meta.tables.length}`, `Photos: ${files.length}`, ...Object.entries(counts).map(([t, n]) => `  ${t}: ${n}`), ...(meta.skipped.length ? [`Skipped: ${meta.skipped.join("; ")}`] : [])].join("\n") + "\n";
  return { sql: sql.join("\n"), files, csv, summary, meta, counts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, flag, out] = process.argv.slice(2);
  if (!file || flag !== "--out" || !out) {
    console.error("Usage: node restore.mjs <backup-file> --out <folder>");
    process.exit(2);
  }
  try {
    const r = buildRestore(readFileSync(file), secret("LCJ_BACKUP_PASSPHRASE", "livecityjapan-backup-passphrase"));
    const dir = resolve(out);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(join(dir, "restore.sql"), r.sql, { mode: 0o600 });
    writeFileSync(join(dir, "accounts.csv"), r.csv, { mode: 0o600 });
    writeFileSync(join(dir, "summary.txt"), r.summary);
    const photoRoot = resolve(dir, "photos");
    for (const f of r.files) {
      const target = resolve(photoRoot, f.p);
      if (!target.startsWith(photoRoot + "/")) throw new Error("Refusing an unsafe photo path in the backup.");
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, Buffer.from(f.b64, "base64"), { mode: 0o600 });
    }
    console.log(r.summary + `Written to ${dir}`);
  } catch (e) {
    console.error("Restore preparation FAILED:", e.message);
    process.exit(1);
  }
}
