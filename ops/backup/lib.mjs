// Shared helpers for the LIVE CITY JAPAN backup tools: authenticated encryption, secret lookup, entry-point check.
//
// Encryption is AES-256-GCM from Node's built-in crypto (no extra package). The key comes from a passphrase through
// scrypt (deliberately slow and memory-hungry, so guessing a passphrase offline is expensive), so the passphrase is
// never stored in the file; GCM also detects any tampering or truncation. File layout:
//   "LCJBK2\n" | 1 byte: scrypt cost exponent | 16 bytes salt | 12 bytes iv | 16 bytes tag | ciphertext
// The marker and the cost byte are bound into the encryption as associated data, so neither can be altered unnoticed.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MAGIC = Buffer.from("LCJBK2\n");
const LOG_N = 17; // scrypt N = 2^17 (about 128 MB of memory and a fraction of a second per guess)
const MIN_LOG_N = 14;
const MAX_LOG_N = 20;
const params = (logN) => ({ N: 2 ** logN, r: 8, p: 1, maxmem: 512 * 1024 * 1024 });

export function encrypt(plain, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const head = Buffer.concat([MAGIC, Buffer.from([LOG_N])]);
  const cipher = createCipheriv("aes-256-gcm", scryptSync(passphrase, salt, 32, params(LOG_N)), iv);
  cipher.setAAD(head);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([head, salt, iv, cipher.getAuthTag(), body]);
}

export function decrypt(file, passphrase) {
  const headLen = MAGIC.length + 1;
  if (file.length < headLen + 16 + 12 + 16 || !file.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Not a LIVE CITY backup file (or it is damaged).");
  const logN = file[MAGIC.length];
  if (logN < MIN_LOG_N || logN > MAX_LOG_N) throw new Error("Not a LIVE CITY backup file (or it is damaged).");
  const head = file.subarray(0, headLen);
  let o = headLen;
  const salt = file.subarray(o, (o += 16));
  const iv = file.subarray(o, (o += 12));
  const tag = file.subarray(o, (o += 16));
  const decipher = createDecipheriv("aes-256-gcm", scryptSync(passphrase, salt, 32, params(logN)), iv);
  decipher.setAAD(head);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(file.subarray(o)), decipher.final()]);
  } catch {
    throw new Error("Could not decrypt: wrong passphrase, or the file was changed or cut short.");
  }
}

// Secrets are read from an environment variable first (handy for tests), otherwise from the macOS Keychain, so they
// are never written in a file in this folder. See README.md for the one-time Keychain commands. The value is held in
// memory only and is never printed.
export function secret(envName, keychainService) {
  if (process.env[envName]) return process.env[envName];
  if (process.platform === "darwin") {
    try {
      return execFileSync("security", ["find-generic-password", "-a", "livecityjapan", "-s", keychainService, "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      /* not stored */
    }
  }
  throw new Error(`Missing secret "${keychainService}". Store it in the Keychain as described in ops/backup/README.md.`);
}

// The Keychain entry may hold either a full connection string ("postgresql://user:password@host:port/db") or JUST the
// database password. With only a password, the address is built from fixed, non-secret parts (this project's
// connection-pooler address and login name; override with LCJ_BACKUP_DB_HOST / _USER / _PORT, for instance to use
// Supabase's read-only user), and the password is URL-encoded so symbols cannot break it. The result is never printed.
export function dbUrlFromSecret(value, env = process.env) {
  const v = value.trim();
  if (/^postgres(ql)?:\/\//i.test(v)) return v;
  const host = env.LCJ_BACKUP_DB_HOST ?? "aws-1-ap-northeast-1.pooler.supabase.com";
  const user = env.LCJ_BACKUP_DB_USER ?? "postgres.kmulidalmhqezaffadzc";
  const port = env.LCJ_BACKUP_DB_PORT ?? "5432";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(v)}@${host}:${port}/postgres`;
}

// True when this file was started directly from the command line (not imported). The old check compared the file's
// address with the raw path, which silently failed whenever the folder name contained a space (as this project's does).
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return metaUrl === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}
