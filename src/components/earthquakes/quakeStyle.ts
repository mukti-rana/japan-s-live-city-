import type { QuakeDetail } from "@/lib/services/earthquake";

// Shared look and wording for the Earthquakes page: the shindo (seismic intensity) colours, the plain-language class of a magnitude and a
// depth, how a tsunami status is coloured, and the JMA report types. Strings are English keys, translated where they are shown.

export const SHINDO_COLOR: Record<string, string> = {
  "1": "#5fd4b0",
  "2": "#86dc7c",
  "3": "#f1d65a",
  "4": "#f5a64a",
  "5-": "#f57f4a",
  "5+": "#f2564f",
  "6-": "#e83a6b",
  "6+": "#d03fd2",
  "7": "#a779ff",
};
export const shindoColor = (label: string) => SHINDO_COLOR[label] ?? "#9aa3b8";

// What a shindo level feels like (the JMA's own scale, in short).
export const SHINDO_FEEL: Record<string, string> = {
  "1": "Felt slightly by some people indoors.",
  "2": "Felt by most people indoors; hanging objects sway a little.",
  "3": "Felt by nearly everyone indoors; dishes rattle.",
  "4": "Most people are startled; hanging objects swing greatly and unstable items may fall.",
  "5-": "Many people are frightened and want to hold on to something; dishes and books may fall.",
  "5+": "Hard to move without holding on; furniture may move and walls may crack.",
  "6-": "Hard to stand; heavy furniture may topple and some buildings are damaged.",
  "6+": "Impossible to stand; people may have to crawl, and many buildings are damaged.",
  "7": "People may be thrown by the shaking; severe damage is likely.",
};

export function magnitudeClass(m: number): string {
  if (m >= 7) return "Major";
  if (m >= 6) return "Strong";
  if (m >= 5) return "Moderate";
  if (m >= 4) return "Light";
  return "Minor";
}

export function depthClass(km: number): string {
  if (km >= 300) return "Deep (over 300 km)";
  if (km >= 70) return "Intermediate (70–300 km)";
  return "Shallow (under 70 km)";
}

// Tsunami status colour: calm, caution, or alert.
export function tsunamiTone(code: string): "ok" | "watch" | "alert" {
  if (code === "Watch" || code === "Warning" || code === "MajorWarning") return "alert";
  if (code === "Checking") return "watch";
  return "ok";
}
export const TONE_COLOR = { ok: "#5fd4b0", watch: "#f1d65a", alert: "#f2564f" } as const;

export const REPORT_LABEL: Record<string, string> = {
  ScalePrompt: "Early intensity report",
  Destination: "Epicentre report",
  ScaleAndDestination: "Intensity and epicentre report",
  DetailScale: "Detailed intensity report",
  Foreign: "Overseas earthquake report",
  Other: "Earthquake report",
};

// JMA's "2026/11/19 21:29:00" (Japan time) as a Date.
export const quakeDate = (raw: string) => new Date(`${raw.replace(/\//g, "-").replace(" ", "T").slice(0, 19)}+09:00`);

export function feltByPrefecture(q: QuakeDetail) {
  const map = new Map<string, { pref: string; code: number; label: string; count: number }>();
  for (const p of q.felt) {
    const cur = map.get(p.pref);
    if (!cur) map.set(p.pref, { pref: p.pref, code: p.scaleCode, label: p.scale, count: 1 });
    else {
      cur.count += 1;
      if (p.scaleCode > cur.code) {
        cur.code = p.scaleCode;
        cur.label = p.scale;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.code - a.code || b.count - a.count);
}
