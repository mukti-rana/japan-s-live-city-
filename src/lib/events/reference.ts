import { classifyKindForReference } from "@/lib/events/referenceKind";
import { addDays, jstDate } from "@/lib/events/time";
import { FESTIVALS, type DateRule, type FestivalInfo } from "@/lib/data/events";
import type { EventItem } from "@/lib/events/types";
import type { ProviderResult } from "@/lib/events/municipal";

// Well-known annual festivals. Their dates are the festival's *usual schedule*
// (e.g. "the last Saturday of July") worked out for this year — they are NOT
// confirmed by an organizer, and the page says so on every one of them.
// Descriptions and photos come from each festival's Wikipedia article; a
// photo is only used when it is hosted on Wikimedia Commons (free licence).

interface Place {
  prefectureId: string;
  lat: number;
  lon: number;
}

const CITY: Record<string, Place> = {
  Sapporo: { prefectureId: "hokkaido", lat: 43.0618, lon: 141.3545 },
  Kyoto: { prefectureId: "kyoto", lat: 35.0116, lon: 135.7681 },
  Tokyo: { prefectureId: "tokyo", lat: 35.6895, lon: 139.6917 },
  Fukuoka: { prefectureId: "fukuoka", lat: 33.5904, lon: 130.4017 },
  Osaka: { prefectureId: "osaka", lat: 34.6937, lon: 135.5023 },
  Aomori: { prefectureId: "aomori", lat: 40.8244, lon: 140.74 },
  Tokushima: { prefectureId: "tokushima", lat: 34.0658, lon: 134.5593 },
  Nagasaki: { prefectureId: "nagasaki", lat: 32.7503, lon: 129.8777 },
  Takayama: { prefectureId: "gifu", lat: 36.1461, lon: 137.2522 },
  Sendai: { prefectureId: "miyagi", lat: 38.2682, lon: 140.8694 },
  Kawagoe: { prefectureId: "saitama", lat: 35.9251, lon: 139.4858 },
  Chichibu: { prefectureId: "saitama", lat: 35.9919, lon: 139.0851 },
};

// Added to the project's original curated list. Each rule is a well-documented
// annual schedule; the Wikipedia page is where details can be checked.
const EXTRA: FestivalInfo[] = [
  { name: "Sendai Tanabata Festival", city: "Sendai", wikipediaTitle: "Sendai_Tanabata_Festival", category: "Festival", gradient: "", dateRule: { type: "fixed", month: 8, day: 6, days: 3 } },
  { name: "Kawagoe Festival", city: "Kawagoe", wikipediaTitle: "Kawagoe_Festival", category: "Festival", gradient: "", dateRule: { type: "nthWeekday", month: 10, weekday: 6, nth: 3, days: 2 } },
  { name: "Chichibu Night Festival", city: "Chichibu", wikipediaTitle: "Chichibu_Night_Festival", category: "Festival", gradient: "", dateRule: { type: "fixed", month: 12, day: 2, days: 2 } },
];

function nthWeekday(year: number, month: number, weekday: number, nth: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7;
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function lastWeekday(year: number, month: number, weekday: number): string {
  const last = new Date(Date.UTC(year, month, 0));
  const day = last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function startOf(rule: DateRule, year: number): string {
  switch (rule.type) {
    case "fixed":
      return new Date(Date.UTC(year, rule.month - 1, rule.day)).toISOString().slice(0, 10);
    case "nthWeekday":
      return nthWeekday(year, rule.month, rule.weekday, rule.nth);
    case "lastWeekday":
      return lastWeekday(year, rule.month, rule.weekday);
  }
}

// The occurrence that is still relevant today: current, upcoming, or one that
// ended within the last two weeks.
function occurrence(rule: DateRule, today: string): { start: string; end: string } {
  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    const start = startOf(rule, y);
    const end = addDays(start, (rule.days ?? 1) - 1);
    if (end >= addDays(today, -14)) return { start, end };
  }
  const start = startOf(rule, year + 2);
  return { start, end: addDays(start, (rule.days ?? 1) - 1) };
}

interface WikiSummary {
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

// Remembered for a day, so a refresh of the events never re-asks Wikipedia for
// an article it already has — and a moment of rate-limiting can't strip the
// photos off events whose summary was already fetched.
const memo = new Map<string, { at: number; data: WikiSummary }>();
const MEMO_TTL = 24 * 60 * 60 * 1000;

async function wikipedia(title: string): Promise<WikiSummary | null> {
  const hit = memo.get(title);
  if (hit && Date.now() - hit.at < MEMO_TTL) return hit.data;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "LiveCityJapan/1.0 (educational project; events aggregator)" },
      });
      if (res.ok) {
        const data = (await res.json()) as WikiSummary;
        memo.set(title, { at: Date.now(), data });
        return data;
      }
      if (res.status !== 429) break;
      // Rate-limited: wait as long as Wikipedia asks (up to 3 seconds), once.
      const wait = Math.min(3000, (Number(res.headers.get("retry-after")) || 1) * 1000);
      await new Promise((r) => setTimeout(r, wait));
    } catch {
      break;
    }
  }
  // Stale is better than nothing.
  return hit?.data ?? null;
}

function shorten(text: string, max = 300): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = cut.lastIndexOf(". ");
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.trim()}…`;
}

// Wikimedia Commons hosts free-licensed files; other Wikipedia images may be
// restricted "fair use" uploads, which we don't reuse. Only Commons URLs pass.
// The API's thumbnail is small (330px), so a standard larger size (960px, one Wikimedia serves) is used.
function commonsImage(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const fromCommons =
      (u.hostname === "thumb.wikimedia.org" || u.hostname === "upload.wikimedia.org") && u.pathname.startsWith("/wikipedia/commons/");
    if (!fromCommons) return null;
    u.search = "";
    u.pathname = u.pathname.replace(/\/\d+px-/, "/960px-");
    return u.toString();
  } catch {
    return null;
  }
}

export async function fetchReference(deadline: number): Promise<ProviderResult> {
  const today = jstDate();
  const all = [...FESTIVALS, ...EXTRA];
  const events: EventItem[] = [];

  // One at a time with a short pause: gentle on Wikipedia, and cached for a day.
  let complete = true;
  for (const festival of all) {
    const place = CITY[festival.city];
    if (!place) continue;
    // Out of time: stop here; the rest load on the next request (what has
    // already been fetched is remembered).
    if (Date.now() > deadline) {
      complete = false;
      break;
    }
    const wiki = await wikipedia(festival.wikipediaTitle);
    const range = occurrence(festival.dateRule, today);
    const pageUrl = wiki?.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(festival.wikipediaTitle)}`;
    const image = commonsImage(wiki?.thumbnail?.source);

    events.push({
      id: `ref-${festival.wikipediaTitle.toLowerCase()}-${range.start}`,
      title: festival.name,
      kind: classifyKindForReference(festival),
      status: "scheduled",
      ranges: [range],
      startTime: null,
      endTime: null,
      dateNote: null,
      venue: null,
      address: null,
      prefectureId: place.prefectureId,
      city: festival.city,
      lat: place.lat,
      lon: place.lon,
      locationApprox: true,
      description: wiki?.extract ? shorten(wiki.extract) : null,
      url: pageUrl,
      organizer: null,
      price: { free: null, text: null },
      familyFriendly: false,
      image: image
        ? { url: image, credit: "Wikimedia Commons (via Wikipedia)", licence: "Free licence — see the file page on Wikimedia Commons", pageUrl }
        : null,
      source: { id: "annual-reference", name: "Annual festival calendar", type: "annual-reference", url: "https://en.wikipedia.org/" },
      announcedAt: null,
      sourceUpdatedAt: null,
      typicalDates: true,
    });
    await new Promise((r) => setTimeout(r, 120));
  }
  return { events, updatedAt: null, complete };
}

// Japanese names of the festivals above. When an official city/prefecture list
// has the same event (same prefecture, overlapping dates), the official entry
// is shown and this reference entry is dropped.
const ALIASES: Record<string, string[]> = {
  Sapporo_Snow_Festival: ["雪まつり"],
  Aoi_Matsuri: ["葵祭"],
  Sanja_Matsuri: ["三社祭"],
  Hakata_Gion_Yamakasa: ["山笠"],
  Gion_Matsuri: ["祇園祭"],
  Tenjin_Matsuri: ["天神祭"],
  Sumida_River_Fireworks_Festival: ["隅田川花火"],
  Nebuta_Matsuri: ["ねぶた", "ネブタ"],
  Awa_Odori: ["阿波おどり", "阿波踊り"],
  Daimonji: ["大文字", "送り火"],
  Kishiwada_Danjiri_Matsuri: ["だんじり", "岸和田"],
  Nagasaki_Kunchi: ["くんち"],
  Takayama_Festival: ["高山祭"],
  Jidai_Matsuri: ["時代祭"],
  Sendai_Tanabata_Festival: ["七夕"],
  Kawagoe_Festival: ["川越まつり"],
  Chichibu_Night_Festival: ["秩父夜祭"],
};

export function supersededByOfficial(reference: EventItem, official: EventItem[]): boolean {
  const key = [...FESTIVALS, ...EXTRA].find((f) => reference.id.startsWith(`ref-${f.wikipediaTitle.toLowerCase()}-`))?.wikipediaTitle;
  const names = key ? ALIASES[key] : undefined;
  if (!names) return false;
  const range = reference.ranges[0];
  return official.some(
    (e) =>
      e.prefectureId === reference.prefectureId &&
      names.some((n) => e.title.includes(n)) &&
      e.ranges.some((r) => r.start <= addDays(range.end, 3) && r.end >= addDays(range.start, -3)),
  );
}
