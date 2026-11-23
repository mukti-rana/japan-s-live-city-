// Shared helpers for the LIVE CITY JAPAN backup tools: authenticated encryption and secret lookup.
// Encryption is AES-256-GCM from Node's built-in crypto (no extra package). The key comes from a passphrase through
// scrypt, so the passphrase is never stored in the file; GCM also detects any tampering or truncation.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { execFileSync } from "node:child_process";

const MAGIC = Buffer.from("LCJBK1\n"); // file format marker (also bound into the encryption as associated data)
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

export function encrypt(plain, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", scryptSync(passphrase, salt, 32, SCRYPT), iv);
  cipher.setAAD(MAGIC);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]);
}

export function decrypt(file, passphrase) {
  if (file.length < MAGIC.length + 16 + 12 + 16 || !file.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Not a LIVE CITY backup file (or it is damaged).");
  let o = MAGIC.length;
  const salt = file.subarray(o, (o += 16));
  const iv = file.subarray(o, (o += 12));
  const tag = file.subarray(o, (o += 16));
  const decipher = createDecipheriv("aes-256-gcm", scryptSync(passphrase, salt, 32, SCRYPT), iv);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(file.subarray(o)), decipher.final()]);
  } catch {
    throw new Error("Could not decrypt: wrong passphrase, or the file was changed or cut short.");
  }
}

// Secrets are read from an environment variable first (handy for tests), otherwise from the macOS Keychain, so they
// are never written in a file in this folder. See README.md for the one-time Keychain commands.
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
