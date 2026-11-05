import type { LanguageCode } from "@/lib/i18n/languages";
import { PREFECTURES } from "@/lib/news/places";
import type { Destination } from "@/lib/explore/types";

// A place's name in the reader's language; falls back to English, then
// Japanese. These are proper nouns taken from the open data — never a code.
export function placeName(d: Pick<Destination, "names">, language: LanguageCode): string {
  return d.names[language] ?? d.names.en ?? d.names.ja ?? "";
}

// The name in Japanese when it adds something beyond the displayed name.
export function placeNameJa(d: Pick<Destination, "names">, language: LanguageCode): string | null {
  const shown = placeName(d, language);
  return d.names.ja && d.names.ja !== shown ? d.names.ja : null;
}

// Wikipedia's introduction in the reader's language when there is one; else
// the other language it exists in, with that language reported so the UI can say so.
export function placeAbout(d: Pick<Destination, "abouts">, language: LanguageCode): { text: string; url: string | null; language: "en" | "ja" } | null {
  const order: ("en" | "ja")[] = language === "ja" ? ["ja", "en"] : ["en", "ja"];
  for (const l of order) {
    const a = d.abouts[l];
    if (a) return { ...a, language: l };
  }
  return null;
}

export function prefectureLabel(id: string, language: LanguageCode): string {
  const p = PREFECTURES.find((x) => x.id === id);
  return p ? (language === "ja" ? p.ja : p.en) : id;
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 10) * 100} m` : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}
