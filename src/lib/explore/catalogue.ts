import raw from "@/data/explore/catalogue.json";
import meta from "@/data/explore/catalogue.meta.json";
import { haversineKm } from "@/lib/events/geo";
import type { LanguageCode } from "@/lib/i18n/languages";
import { PREFECTURES } from "@/lib/news/places";
import { CATEGORY_BY_ID, type CategoryId, type Season } from "@/lib/explore/categories";
import { REGION_OF_PREFECTURE } from "@/lib/explore/regions";
import type { CatalogueMeta, Destination, ExploreQuery, ExploreResult } from "@/lib/explore/types";
import { localize } from "@/lib/i18n/translate";

// The catalogue is generated from open data by `npm run catalogue:build` (see
// scripts/build-catalogue.mjs) and read here. It is loaded once per server
// process. Adding places means re-running that script — never editing records
// by hand.

interface Record_ {
  id: string;
  n: Partial<Record<LanguageCode, string>>;
  pref: string;
  city: string | null;
  lat: number;
  lon: number;
  cat: CategoryId;
  cats: CategoryId[];
  links: number;
  img: string | null;
  credit: { author: string | null; license: string | null } | null;
  web: string | null;
  wh?: boolean;
  about: Partial<Record<"en" | "ja", string>> | null;
  wiki: { en: string | null; ja: string | null };
}

// Places that are in the open data under a tourist-friendly class but are not
// somewhere a visitor goes to explore (airports built on artificial islands,
// military islands, and so on).
const NOT_A_DESTINATION = /airport|air base|heliport|空港|飛行場|硫黄島|iwo jima/i;

const RECORDS = (raw as unknown as Record_[]).filter((r) => !NOT_A_DESTINATION.test(`${r.n.en ?? ""} ${r.n.ja ?? ""}`));
export const CATALOGUE_META = meta as CatalogueMeta;

const PREF_BY_ID = new Map(PREFECTURES.map((p) => [p.id, p]));
const BY_ID = new Map(RECORDS.map((r) => [r.id, r]));

// A place is a "hidden gem" when it has something to show (a photo or a
// description) but is known in few languages — real data, no invented scores.
const HIDDEN_MAX_EDITIONS = 3;

const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`;
const commonsFile = (file: string, width: number) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;

export function nameFor(r: Record_, language: LanguageCode): string {
  return r.n[language] ?? r.n.en ?? r.n.ja ?? "";
}

function toDestination(r: Record_, from: { lat: number; lon: number } | null): Destination {
  const cat = CATEGORY_BY_ID.get(r.cat) ?? CATEGORY_BY_ID.get("attraction")!;
  const wikiUrl = (lang: "en" | "ja") => (r.wiki[lang] ? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(r.wiki[lang]!.replace(/ /g, "_"))}` : null);
  const abouts: Destination["abouts"] = {};
  if (r.about?.en) abouts.en = { text: r.about.en, url: wikiUrl("en") };
  if (r.about?.ja) abouts.ja = { text: r.about.ja, url: wikiUrl("ja") };
  return {
    id: r.id,
    names: r.n,
    prefectureId: r.pref,
    region: REGION_OF_PREFECTURE.get(r.pref) ?? "kanto",
    city: r.city,
    lat: r.lat,
    lon: r.lon,
    category: r.cat,
    categories: r.cats,
    group: cat.group,
    abouts,
    image: r.img
      ? { url: commonsFile(r.img, 1280), thumb: commonsFile(r.img, 640), page: commonsPage(r.img), author: r.credit?.author ?? null, license: r.credit?.license ?? null }
      : null,
    website: r.web,
    worldHeritage: Boolean(r.wh),
    languageEditions: r.links,
    hiddenGem: r.links <= HIDDEN_MAX_EDITIONS && Boolean(r.img || r.about),
    seasons: cat.seasons,
    distanceKm: from ? Math.round(haversineKm(from.lat, from.lon, r.lat, r.lon) * 10) / 10 : null,
  };
}

export function getDestination(id: string, from: { lat: number; lon: number } | null = null): Destination | null {
  const r = BY_ID.get(id);
  return r ? toDestination(r, from) : null;
}

// How well a place suits a general "recommended" list: well known, with a
// photo and a description, and closer when a position is given.
function recommendedScore(r: Record_, distanceKm: number | null): number {
  let s = Math.log2(r.links + 1) * 10 + (r.img ? 6 : 0) + (r.about ? 4 : 0) + (r.wh ? 12 : 0);
  if (distanceKm !== null) s -= Math.min(distanceKm, 200) * 0.25;
  return s;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export function queryCatalogue(query: ExploreQuery, language: LanguageCode): ExploreResult {
  const from = query.lat !== undefined && query.lon !== undefined ? { lat: query.lat, lon: query.lon } : null;
  const needle = query.q ? norm(query.q.trim()) : "";
  const cats = query.cats && query.cats.length ? new Set(query.cats) : null;
  const cityNeedle = query.city ? norm(query.city) : "";
  const regionPrefs = query.region ? new Set(PREFECTURES.filter((p) => p.region === query.region).map((p) => p.id)) : null;

  const hits: { r: Record_; d: number | null; score: number }[] = [];
  for (const r of RECORDS) {
    const cat = CATEGORY_BY_ID.get(r.cat);
    if (!cat) continue;
    if (query.pref && r.pref !== query.pref) continue;
    if (regionPrefs && !regionPrefs.has(r.pref)) continue;
    if (cats && !r.cats.some((c) => cats.has(c))) continue;
    if (query.group && cat.group !== query.group) continue;
    if (query.setting && cat.setting !== query.setting && cat.setting !== "mixed") continue;
    if (query.family && !cat.familyFriendly) continue;
    if (query.season && !cat.seasons.includes(query.season as Season)) continue;
    if (query.maxHours !== undefined && cat.hours[0] > query.maxHours) continue;
    if (query.heritage && !r.wh) continue;
    if (query.photo && !r.img) continue;
    if (query.hidden && !(r.links <= HIDDEN_MAX_EDITIONS && (r.img || r.about))) continue;
    if (cityNeedle && !(r.city && norm(r.city).includes(cityNeedle))) continue;
    if (query.bbox) {
      const [s, w, n, e] = query.bbox;
      if (r.lat < s || r.lat > n || r.lon < w || r.lon > e) continue;
    }
    if (needle) {
      const hay = norm(`${r.n.en ?? ""} ${r.n.ja ?? ""} ${r.n[language] ?? ""} ${r.city ?? ""}`);
      if (!hay.includes(needle)) continue;
    }
    let d: number | null = null;
    if (from) {
      d = haversineKm(from.lat, from.lon, r.lat, r.lon);
      if (query.radius !== undefined && d > query.radius) continue;
      if (query.minRadius !== undefined && d < query.minRadius) continue;
    }
    hits.push({ r, d, score: recommendedScore(r, d) });
  }

  const sort = query.sort ?? (from ? "recommended" : "popular");
  if (sort === "nearest" && from) hits.sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
  else if (sort === "popular") hits.sort((a, b) => b.r.links - a.r.links || a.r.id.localeCompare(b.r.id));
  else if (sort === "name") hits.sort((a, b) => nameFor(a.r, language).localeCompare(nameFor(b.r, language), language));
  else hits.sort((a, b) => b.score - a.score);

  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.min(Math.max(1, query.limit ?? 24), 200);
  const page = hits.slice(offset, offset + limit).map((h) => toDestination(h.r, from));
  return { items: page, total: hits.length, nextOffset: offset + limit < hits.length ? offset + limit : null };
}

// Places near a given destination, for its detail page.
export function nearbyTo(id: string, radius = 25, limit = 8): Destination[] {
  const r = BY_ID.get(id);
  if (!r) return [];
  const res = queryCatalogue({ lat: r.lat, lon: r.lon, radius, sort: "recommended", limit: limit + 1 }, "en");
  return res.items.filter((d) => d.id !== id).slice(0, limit);
}

export interface Suggestion {
  type: "place" | "city" | "prefecture";
  label: string;
  sub: string;
  value: string;
  id?: string;
  prefectureId?: string;
}

export function suggest(q: string, language: LanguageCode): Suggestion[] {
  const needle = norm(q.trim());
  if (needle.length < 1) return [];
  const out: Suggestion[] = [];
  for (const p of PREFECTURES) {
    if (norm(p.en).startsWith(needle) || p.ja.startsWith(q.trim())) {
      out.push({ type: "prefecture", label: localize(p.en, p.ja, language), sub: language === "ja" ? p.en : p.ja, value: p.id, prefectureId: p.id });
    }
  }
  const cityCount = new Map<string, { n: number; pref: string }>();
  for (const r of RECORDS) {
    if (r.city && norm(r.city).startsWith(needle)) {
      const c = cityCount.get(r.city) ?? { n: 0, pref: r.pref };
      c.n++;
      cityCount.set(r.city, c);
    }
  }
  for (const [city, c] of [...cityCount.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3)) {
    out.push({ type: "city", label: city, sub: `${c.n}`, value: city, prefectureId: c.pref });
  }
  const places: { r: Record_; rank: number }[] = [];
  for (const r of RECORDS) {
    const names = [r.n.en, r.n.ja, r.n[language]].filter(Boolean).map((n) => norm(n as string));
    const starts = names.some((n) => n.startsWith(needle));
    const has = names.some((n) => n.includes(needle));
    if (starts || has) places.push({ r, rank: (starts ? 1000 : 0) + r.links });
  }
  places.sort((a, b) => b.rank - a.rank);
  for (const { r } of places.slice(0, 8)) {
    out.push({ type: "place", label: nameFor(r, language), sub: [r.city, PREF_BY_ID.get(r.pref)?.en].filter(Boolean).join(", "), value: r.id, id: r.id, prefectureId: r.pref });
  }
  return out.slice(0, 12);
}

export function catalogueStats(): CatalogueMeta {
  // The size after the same exclusions the app applies when it loads the data.
  return { ...CATALOGUE_META, total: RECORDS.length };
}

export const CATALOGUE_SIZE = RECORDS.length;
