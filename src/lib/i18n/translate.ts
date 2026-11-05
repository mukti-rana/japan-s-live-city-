import type { LanguageCode } from "@/lib/i18n/languages";
import ja from "@/lib/i18n/translations/ja.json";
import ne from "@/lib/i18n/translations/ne.json";
import hi from "@/lib/i18n/translations/hi.json";
import zh from "@/lib/i18n/translations/zh.json";
import ko from "@/lib/i18n/translations/ko.json";

// A string with its translations beside it. English is required and is what a
// reader sees only when no translation exists yet (see `translate` below).
export type Text = { en: string } & Partial<Record<LanguageCode, string>>;
export type Table = Record<string, Text>;

// ── The shared translation memory ─────────────────────────────────────────
// Interface text written next to a component lists English and (usually)
// Japanese. Every other language comes from these files, which are keyed by
// the English sentence — one entry serves every place that sentence appears,
// and a sentence is only ever translated once. `npm run i18n:check` lists any
// English text that is still missing from them.
const MEMORY: Partial<Record<LanguageCode, Record<string, string>>> = { ja, ne, hi, zh, ko };

const reported = new Set<string>();

// During development a missing translation is reported once in the console,
// so gaps are noticed instead of silently showing English.
function reportMissing(language: LanguageCode, english: string) {
  if (process.env.NODE_ENV === "production" || language === "en") return;
  const key = `${language}:${english}`;
  if (reported.has(key)) return;
  reported.add(key);
  console.warn(`[i18n] Missing ${language} translation for: "${english}"`);
}

// Translates one English sentence (or word) into the reader's language from
// the shared memory. Returns the English original if there is no translation.
// The memory's answer, or null — no warning, for text that may legitimately be
// outside it (a page title built from live data).
export function lookup(english: string, language: LanguageCode): string | null {
  if (language === "en") return english;
  return MEMORY[language]?.[english] ?? null;
}

// A proper name that may or may not be in the memory (a publisher, a town):
// translated when known, otherwise exactly as received — no warning.
export function known(name: string, language: LanguageCode): string {
  return lookup(name, language) ?? name;
}

export function translate(english: string, language: LanguageCode): string {
  if (language === "en") return english;
  const hit = MEMORY[language]?.[english];
  if (hit) return hit;
  // "105K views", "3 results": the same sentence with a different number is
  // one memory entry written as "{n} views" — the real figure goes back in.
  const num = /\d[\d.,]*[KM]?/.exec(english);
  if (num) {
    const templated = MEMORY[language]?.[english.replace(num[0], "{n}")];
    if (templated) return templated.replace("{n}", num[0]);
  }
  reportMissing(language, english);
  return english;
}

// A place name: the Japanese name for Japanese readers, the English name for
// English readers, and for the other languages the English name translated
// through the shared memory (every prefecture and major city is in it).
export function localize(en: string, ja: string | null | undefined, language: LanguageCode): string {
  if (language === "ja") return ja || en;
  return translate(en, language);
}

// An official alert's title. Fixed warning names come from the shared memory;
// the two composed ones (an earthquake's intensity and magnitude, a typhoon's
// number) are rebuilt from the same real numbers in the reader's language.
export function localizeAlert(a: { title: string; titleJa: string }, language: LanguageCode): string {
  if (language === "ja") return a.titleJa;
  if (language === "en") return a.title;
  const known = MEMORY[language]?.[a.title];
  if (known) return known;
  const quake = /^Earthquake — seismic intensity ([^,]+)(?:, magnitude ([\d.]+))?$/.exec(a.title);
  if (quake) {
    const [, intensity, magnitude] = quake;
    const t = {
      ne: `भूकम्प — भूकम्पीय तीव्रता ${intensity}${magnitude ? `, म्याग्निच्युड ${magnitude}` : ""}`,
      hi: `भूकंप — भूकंपीय तीव्रता ${intensity}${magnitude ? `, परिमाण ${magnitude}` : ""}`,
      zh: `地震——震度${intensity}${magnitude ? `，震级${magnitude}` : ""}`,
      ko: `지진 — 진도 ${intensity}${magnitude ? `, 규모 ${magnitude}` : ""}`,
    } as Partial<Record<LanguageCode, string>>;
    if (t[language]) return t[language] as string;
  }
  const storm = /^(Tropical depression|Tropical storm|Severe tropical storm|Typhoon) No\. (\d+)$/.exec(a.title);
  if (storm) {
    const [, category, n] = storm;
    const name: Record<string, Partial<Record<LanguageCode, string>>> = {
      Typhoon: { ne: "टाइफुन", hi: "टाइफ़ून", zh: "台风", ko: "태풍" },
      "Tropical storm": { ne: "उष्णकटिबन्धीय आँधी", hi: "उष्णकटिबंधीय तूफ़ान", zh: "热带风暴", ko: "열대폭풍" },
      "Severe tropical storm": { ne: "तीव्र उष्णकटिबन्धीय आँधी", hi: "तीव्र उष्णकटिबंधीय तूफ़ान", zh: "强热带风暴", ko: "강한 열대폭풍" },
      "Tropical depression": { ne: "उष्णकटिबन्धीय न्यूनचाप", hi: "उष्णकटिबंधीय अवदाब", zh: "热带低压", ko: "열대저압부" },
    };
    const c = name[category]?.[language];
    if (c) return { ne: `${c} नं. ${n}`, hi: `${c} संख्या ${n}`, zh: `${c}${n}号`, ko: `${c} ${n}호` }[language as "ne" | "hi" | "zh" | "ko"];
  }
  return translate(a.title, language);
}

export function pick(text: Text, language: LanguageCode): string {
  return text[language] ?? translate(text.en, language);
}

// For content written in English and Japanese: Japanese readers get the
// Japanese, everyone else the English translated through the shared memory.
export function pickJaEn<T extends string | string[]>(value: { en: T; ja: T }, language: LanguageCode): T {
  if (language === "ja") return value.ja;
  if (language === "en") return value.en;
  if (Array.isArray(value.en)) return value.en.map((s) => translate(s, language)) as T;
  return translate(value.en as string, language) as T;
}


// Notes written by the server in English that contain a count ("… for 8
// offices …"): the number is swapped for {n}, the sentence translated, and the
// real number put back — so the figure is never changed or invented.
export function translateWithNumber(english: string, language: LanguageCode): string {
  if (language === "en") return english;
  const m = /\b(\d+) offices\b/.exec(english);
  if (!m) return translate(english, language);
  const generic = english.replace(m[1], "{n}");
  const out = translate(generic, language);
  return out === generic ? english : out.replace("{n}", m[1]);
}
