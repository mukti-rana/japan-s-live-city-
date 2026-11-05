import { PREFECTURES } from "@/lib/news/places";
import { SEASONS } from "@/lib/explore/categories";
import { TOPICS } from "@/lib/explore/topics";

// Turns a typed sentence into filters, where that is practical:
//   "temples in Kyoto"   → topic Shrines & Temples + Kyoto
//   "hot springs winter" → topic Unique Experiences + winter
//   "quiet hidden places in Nagano"
// Whatever is left over is kept as plain text for the name search. Nothing is
// guessed: only words that match a known topic, season or prefecture are used.
export interface ParsedSearch {
  topics: string[];
  pref: string;
  season: string;
  text: string;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export function parseSearch(input: string): ParsedSearch {
  let rest = ` ${norm(input).replace(/[^\p{L}\p{N}\s'-]/gu, " ")} `;
  const out: ParsedSearch = { topics: [], pref: "", season: "", text: "" };

  // Longest names first so "Kagoshima" is not read as a shorter name inside it.
  const prefs = [...PREFECTURES].sort((a, b) => b.en.length - a.en.length);
  for (const p of prefs) {
    const name = ` ${norm(p.en)} `;
    if (rest.includes(name) || rest.includes(` ${p.ja} `)) {
      out.pref = p.id;
      rest = rest.replace(name, " ").replace(` ${p.ja} `, " ");
      break;
    }
  }
  for (const s of SEASONS) {
    const w = ` ${s.label.en.toLowerCase()} `;
    if (rest.includes(w)) {
      out.season = s.id;
      rest = rest.replace(w, " ");
      break;
    }
  }
  for (const t of TOPICS) {
    for (const w of [...t.words].sort((a, b) => b.length - a.length)) {
      const needle = ` ${w} `;
      if (rest.includes(needle)) {
        if (!out.topics.includes(t.id)) out.topics.push(t.id);
        rest = rest.replace(needle, " ");
      }
    }
  }
  // Filler words that carry no meaning for the search.
  rest = rest.replace(/\b(in|near|around|at|the|best|top|good|great|places?|things?|to|do|visit|see|go|a|an|and|for|of|with|nice|famous|popular)\b/g, " ");
  out.text = rest.replace(/\s+/g, " ").trim();
  return out;
}
