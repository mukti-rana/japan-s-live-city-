import { buildSections, type Scope, type WeatherKind } from "@/lib/explore/sections";
import { PREFECTURES } from "@/lib/news/places";
import { isLanguageCode } from "@/lib/i18n/languages";

export const runtime = "nodejs";

const num = (v: string | null) => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// The recommendation rows for the Explore page. Takes a scope, an optional
// position (rounded to ~100 m here) and a coarse weather word — nothing else.
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const scope = (["near", "pref", "all"] as const).includes(p.get("scope") as Scope) ? (p.get("scope") as Scope) : "all";
  const lat = num(p.get("lat"));
  const lon = num(p.get("lon"));
  const pref = p.get("pref");
  const wx = p.get("wx");
  const lang = p.get("lang") ?? "en";
  const sections = buildSections({
    scope,
    lat: lat === null ? null : Math.round(lat * 1000) / 1000,
    lon: lon === null ? null : Math.round(lon * 1000) / 1000,
    accuracyKm: num(p.get("acc")),
    prefectureId: pref && PREFECTURES.some((x) => x.id === pref) ? pref : null,
    weather: wx === "rain" || wx === "clear" || wx === "cloud" || wx === "snow" ? (wx as WeatherKind) : null,
    tempC: num(p.get("temp")),
    language: isLanguageCode(lang) ? lang : "en",
  });
  return Response.json({ sections }, { headers: { "Cache-Control": "private, max-age=120" } });
}
