#!/usr/bin/env node
// Finds translation gaps. Run with:  npm run i18n:check
//
//  1. Dictionaries: every key must exist in all six languages, and a non-English
//     value must not simply repeat the English one (unless it is a name, number
//     or symbol).
//  2. Inline tables ({ en: "...", ja: "..." } objects used by useInline):
//     every entry must carry all six languages.
//  3. Hard-coded text: visible English written straight into JSX or into
//     placeholder / aria-label / title / alt attributes instead of going
//     through the translation system.
//
// Exit code 1 when anything is missing, so it can run in CI or before a push.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(ROOT, "src");
const LANGS = ["en", "ja", "ne", "hi", "zh", "ko"];
const strict = process.argv.includes("--strict");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const problems = { dictionaries: [], inline: [], hardcoded: [] };

// ── 1. Dictionaries ─────────────────────────────────────────────────────
function dict(lang) {
  const src = readFileSync(join(SRC, `lib/i18n/dictionaries/${lang}.ts`), "utf8");
  const map = new Map();
  for (const m of src.matchAll(/^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/gm)) map.set(m[1], m[2]);
  return map;
}
const en = dict("en");
for (const lang of LANGS.slice(1)) {
  const d = dict(lang);
  for (const [key, value] of en) {
    if (!d.has(key)) problems.dictionaries.push(`${lang}: missing "${key}"`);
    else if (d.get(key) === value && /[A-Za-z]{4,}/.test(value) && !/^(LIVE CITY|JLPT|SOS|AI|Live City)/i.test(value)) problems.dictionaries.push(`${lang}: "${key}" is the English text`);
  }
}

// ── 2. Inline tables ────────────────────────────────────────────────────
// Each English sentence written beside a component needs a translation for
// every other language, either right there or in the shared memory
// (src/lib/i18n/translations/<lang>.json, keyed by the English sentence).
const memory = Object.fromEntries(
  LANGS.slice(1).map((l) => [l, JSON.parse(readFileSync(join(SRC, `lib/i18n/translations/${l}.json`), "utf8"))]),
);
const seenEnglish = new Map();
// Every place an English sentence is written is checked on its own: one
// entry that has all six languages must not hide another that doesn't.
const note = (raw, have, file, line) => {
  let english = raw;
  try {
    english = JSON.parse(`"${raw}"`);
  } catch {
    /* keep the source text */
  }
  if (english.length < 2 || /^[^A-Za-z]*$/.test(english)) return;
  const e = seenEnglish.get(english) ?? { occurrences: [] };
  e.occurrences.push({ have, where: `${relative(ROOT, file)}:${line}` });
  seenEnglish.set(english, e);
};
for (const file of walk(SRC)) {
  if (file.includes("dictionaries")) continue;
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/\ben:\s*"((?:[^"\\]|\\.)*)"/g)) {
    const obj = text.slice(m.index + m[0].length, m.index + m[0].length + 900).split("}")[0];
    const have = LANGS.filter((l) => new RegExp(`\\b${l}\\s*:`).test(obj));
    note(m[1], have, file, text.slice(0, m.index).split("\n").length);
  }
  // Sentences passed straight to the translator: <Tx en="…" />, tr("…"),
  // translate("…", lang), and label/suffix props that FieldInput & co. translate.
  if (file.endsWith(".tsx") || file.endsWith(".ts")) {
    const lineAt = (i) => text.slice(0, i).split("\n").length;
    const literals = [
      /<Tx\s+en="((?:[^"\\$]|\\.)*)"/g,
      /\b(?:tr|translate)\(\s*"((?:[^"\\$]|\\.)*)"/g,
      /\b(?:label|suffix)="([A-Za-z][^"{}$]*)"/g,
    ];
    for (const re of literals) for (const m of text.matchAll(re)) note(m[1], [], file, lineAt(m.index));
  }
  for (const m of text.matchAll(/\ben:\s*\[(.*?)\]\s*,\s*ja:/gs)) {
    const line = text.slice(0, m.index).split("\n").length;
    for (const mm of m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) note(mm[1], [], file, line);
  }
}
// Files where the Japanese sits beside the English in a different shape (a
// parallel array, or a field written before it), so "ja" is supplied there.
// A sentence that differs only by a number is one memory entry written with {n}.
const inMemory = (l, english) => {
  if (memory[l][english]) return true;
  const num = /\d[\d.,]*[KM]?/.exec(english);
  return Boolean(num && memory[l][english.replace(num[0], "{n}")]);
};
const JA_ELSEWHERE = /(emergency\/content|emergency\/disaster|NewsModal)/;
const missingList = [];
for (const [english, { occurrences }] of seenEnglish) {
  const missing = new Set();
  let where = "";
  for (const { have, where: w } of occurrences) {
    for (const l of LANGS.slice(1)) {
      if (!have.includes(l) && !inMemory(l, english) && !(l === "ja" && JA_ELSEWHERE.test(w))) {
        missing.add(l);
        where ||= w;
      }
    }
  }
  if (missing.size) {
    problems.inline.push(`${where}  “${english.slice(0, 50)}” lacks ${[...missing].join(",")}`);
    missingList.push({ en: english, missing: [...missing] });
  }
}

// ── 3. Hard-coded visible text ──────────────────────────────────────────
// Looks for English words written directly in JSX (between tags, across lines)
// and in placeholder / aria-label / title / alt attributes. Text that goes
// through t(), text(), x() and the like is code in braces, so it is not seen.
const SKIP_FILE = /(dictionaries|strings|explore-text|categories|content|\.d\.ts|opengraph|sitemap|robots|api\/)/;
const ALLOWED = /^(LIVE CITY( JAPAN)?|JAPAN|Leaflet|JLPT|N[1-5]|AI|AED|JMA|JNTO|GSI|OpenStreetMap|Wikipedia|Wikidata|Esri|JST|UNESCO|CC BY-SA|km|m|°C|%|\.env\.local|you@example\.com|NEXT_PUBLIC_[A-Z_]+)$/i;
for (const file of walk(SRC).filter((f) => f.endsWith(".tsx") && !SKIP_FILE.test(f))) {
  const raw = readFileSync(file, "utf8");
  // Blank out comments and strings that aren't JSX so only markup text remains.
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/^\s*\/\/.*$/gm, "").replace(/&(apos|quot|amp|nbsp|mdash|ndash);/g, "'");
  const lineOf = (i) => text.slice(0, i).split("\n").length;
  for (const m of text.matchAll(/>([^<>{}=;&|]+)</g)) {
    const t = m[1].replace(/\s+/g, " ").trim();
    if (t.length < 3 || !/[A-Za-z]{3,}/.test(t) || ALLOWED.test(t)) continue;
    // Code that happens to sit between `>` and `<` (arrows, ternaries, generics).
    if (/\) :|\? \(|\) \)|Promise|=>/.test(t)) continue;
    if (/^[A-Za-z0-9_.()[\]?:!<>=,'"` -]*$/.test(t) && /[()=?:.]/.test(t) && !/ /.test(t)) continue;
    problems.hardcoded.push(`${relative(ROOT, file)}:${lineOf(m.index)}  “${t.slice(0, 60)}”`);
  }
  for (const m of text.matchAll(/\b(placeholder|aria-label|title|alt)="([^"{}]*[A-Za-z]{3,}[^"{}]*)"/g)) {
    if (ALLOWED.test(m[2])) continue;
    if (LANGS.slice(1).every((l) => inMemory(l, m[2]))) continue; // translated by the component it is passed to
    problems.hardcoded.push(`${relative(ROOT, file)}:${lineOf(m.index)}  ${m[1]}="${m[2].slice(0, 50)}"`);
  }
}

if (process.argv.includes("--list")) {
  // Writes every English sentence still missing a translation, for translators.
  const out = missingList;
  writeFileSync("/tmp/i18n-missing.json", JSON.stringify(out, null, 1));
  console.log(`${out.length} sentences written to /tmp/i18n-missing.json`);
}

function report(name, list) {
  console.log(`\n${name}: ${list.length}`);
  for (const p of list.slice(0, strict ? 1000 : 25)) console.log("  " + p);
  if (list.length > 25 && !strict) console.log(`  … and ${list.length - 25} more (run with --strict to list all)`);
}
report("Dictionary gaps", problems.dictionaries);
report("Interface sentences missing a translation", problems.inline);
report("Hard-coded visible text", problems.hardcoded);
const total = problems.dictionaries.length + problems.inline.length + problems.hardcoded.length;
console.log(total === 0 ? "\n✓ No translation gaps found." : `\n✗ ${total} gap(s) found.`);
process.exit(total === 0 ? 0 : 1);
