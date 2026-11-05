import { queryCatalogue } from "@/lib/explore/catalogue";
import { isLanguageCode, type LanguageCode } from "@/lib/i18n/languages";
import type { ExploreQuery } from "@/lib/explore/types";

export const runtime = "nodejs";

const num = (v: string | null): number | undefined => {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// One endpoint for every list on the Explore page and the map: filters in,
// a page of destinations out. Positions are rounded to ~100 m before use.
export function parseQuery(params: URLSearchParams): { query: ExploreQuery; language: LanguageCode } {
  const lang = params.get("lang") ?? "en";
  const language: LanguageCode = isLanguageCode(lang) ? lang : "en";
  const lat = num(params.get("lat"));
  const lon = num(params.get("lon"));
  const round = (n: number | undefined) => (n === undefined ? undefined : Math.round(n * 1000) / 1000);
  const bboxRaw = params.get("bbox")?.split(",").map(Number);
  const bbox = bboxRaw && bboxRaw.length === 4 && bboxRaw.every(Number.isFinite) ? (bboxRaw as [number, number, number, number]) : undefined;
  const sort = params.get("sort");
  const setting = params.get("setting");
  return {
    language,
    query: {
      q: params.get("q")?.slice(0, 80) || undefined,
      region: params.get("region") || undefined,
      pref: params.get("pref") || undefined,
      city: params.get("city")?.slice(0, 60) || undefined,
      cats: params.get("cats")?.split(",").filter(Boolean).slice(0, 20),
      group: params.get("group") || undefined,
      setting: setting === "indoor" || setting === "outdoor" ? setting : undefined,
      family: params.get("family") === "1" || undefined,
      season: params.get("season") || undefined,
      maxHours: num(params.get("maxHours")),
      heritage: params.get("heritage") === "1" || undefined,
      photo: params.get("photo") === "1" || undefined,
      hidden: params.get("hidden") === "1" || undefined,
      lat: lat !== undefined && lon !== undefined ? round(lat) : undefined,
      lon: lat !== undefined && lon !== undefined ? round(lon) : undefined,
      radius: num(params.get("radius")),
      minRadius: num(params.get("minRadius")),
      sort: sort === "nearest" || sort === "popular" || sort === "recommended" || sort === "name" ? sort : undefined,
      offset: num(params.get("offset")),
      limit: num(params.get("limit")),
      bbox,
    },
  };
}

export async function GET(request: Request) {
  const { query, language } = parseQuery(new URL(request.url).searchParams);
  const result = queryCatalogue(query, language);
  return Response.json(result, { headers: { "Cache-Control": "private, max-age=60" } });
}
