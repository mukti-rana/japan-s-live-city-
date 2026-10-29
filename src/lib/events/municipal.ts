import { createHash } from "node:crypto";
import { classifyKind, looksFamilyFriendly, parsePrice, statusFromText } from "@/lib/events/classify";
import { decodeCsv, findDates, parseCsv, parseDate, parseRanges, parseTime } from "@/lib/events/csv";
import { inJapan } from "@/lib/events/geo";
import { addDays, jstDate } from "@/lib/events/time";
import type { DateRange, EventItem, EventSource } from "@/lib/events/types";
import { PREFECTURES } from "@/lib/news/places";
import { toPlainText } from "@/lib/news/normalize";

// Municipal open data: city and prefectural governments publish their own
// event lists as CSV under open-data terms. Each entry below is one such list,
// read from its publisher — nothing is scraped and nothing here needs a key.
//
// This is deliberately a short, reviewed list rather than a crawl of the whole
// catalogue: most municipalities publish nothing current, and fetching hundreds
// of files would be unkind to the publishers' servers. Add an entry once a
// dataset has been checked to hold real, current events.

export interface MunicipalSource {
  id: string;
  name: string;
  prefectureId: string;
  // English city name, or null for a prefectural list (cities vary per event).
  city: string | null;
  // "standard" is the national recommended event-list layout; others are a
  // city's own layout.
  adapter: "standard" | "minato";
  // BODIK dataset id — used to look up the newest file, because publishers
  // rename the file when they update it.
  ckanId?: string;
  pageUrl: string;
  // Last known file; used if the catalogue can't be asked.
  csvUrl: string;
}

export const MUNICIPAL_SOURCES: MunicipalSource[] = [
  {
    id: "okazaki",
    name: "Okazaki City",
    prefectureId: "aichi",
    city: "Okazaki",
    adapter: "standard",
    ckanId: "beb99975-6d85-4463-8767-0cb1d7c414e0",
    pageUrl: "https://data.bodik.jp/dataset/beb99975-6d85-4463-8767-0cb1d7c414e0",
    csvUrl: "https://data.bodik.jp/dataset/beb99975-6d85-4463-8767-0cb1d7c414e0/resource/92a4cbd7-1a7d-47ef-9ead-4c6e42fe6eba/download/232025_event.csv",
  },
  {
    id: "osaka-pref",
    name: "Osaka Prefecture",
    prefectureId: "osaka",
    city: null,
    adapter: "standard",
    ckanId: "388c34d1-f97a-4865-a547-8e89c53a364a",
    pageUrl: "https://data.bodik.jp/dataset/388c34d1-f97a-4865-a547-8e89c53a364a",
    csvUrl: "https://data.bodik.jp/dataset/388c34d1-f97a-4865-a547-8e89c53a364a/resource/a6f32430-9e39-49f7-b429-6e4eadcc96de/download/270008_event.csv",
  },
  {
    id: "kishiwada",
    name: "Kishiwada City",
    prefectureId: "osaka",
    city: "Kishiwada",
    adapter: "standard",
    ckanId: "c22cc38b-9004-4f06-82f9-ed6685798249",
    pageUrl: "https://data.bodik.jp/dataset/c22cc38b-9004-4f06-82f9-ed6685798249",
    csvUrl: "https://data.bodik.jp/dataset/c22cc38b-9004-4f06-82f9-ed6685798249/resource/82b65469-1516-4535-88f6-934367892d04/download/20261005120157_.csv",
  },
  {
    id: "okinawa-pref",
    name: "Okinawa Prefecture",
    prefectureId: "okinawa",
    city: null,
    adapter: "standard",
    ckanId: "55c0bcf2-b656-4e75-ac9f-dbf06796acac",
    pageUrl: "https://data.bodik.jp/dataset/55c0bcf2-b656-4e75-ac9f-dbf06796acac",
    csvUrl: "https://data.bodik.jp/dataset/55c0bcf2-b656-4e75-ac9f-dbf06796acac/resource/bda2e391-3b62-4978-a3bd-3c4e9ede06f0/download/470007_event_2026.csv",
  },
  {
    id: "toyonaka",
    name: "Toyonaka City",
    prefectureId: "osaka",
    city: "Toyonaka",
    adapter: "standard",
    ckanId: "4f4ac809-c36a-46a6-ad39-76e7e2bbf587",
    pageUrl: "https://data.bodik.jp/dataset/4f4ac809-c36a-46a6-ad39-76e7e2bbf587",
    csvUrl: "https://data.bodik.jp/dataset/4f4ac809-c36a-46a6-ad39-76e7e2bbf587/resource/b0a19f54-86b5-4083-bdea-17f7fa76487f/download/272035_event.csv",
  },
  {
    id: "higashiosaka",
    name: "Higashiosaka City",
    prefectureId: "osaka",
    city: "Higashiosaka",
    adapter: "standard",
    ckanId: "ebba962b-9fa2-4997-aa3b-e5d92c83a810",
    pageUrl: "https://data.bodik.jp/dataset/ebba962b-9fa2-4997-aa3b-e5d92c83a810",
    csvUrl: "https://data.bodik.jp/dataset/ebba962b-9fa2-4997-aa3b-e5d92c83a810/resource/0849fcf9-a505-42b8-827c-58a9d72d5317/download/272272_event.csv",
  },
  {
    id: "saga-city",
    name: "Saga City",
    prefectureId: "saga",
    city: "Saga",
    adapter: "standard",
    ckanId: "b2a8014c-3b97-47f6-9509-91dedcfc64ba",
    pageUrl: "https://data.bodik.jp/dataset/b2a8014c-3b97-47f6-9509-91dedcfc64ba",
    csvUrl: "https://data.bodik.jp/dataset/b2a8014c-3b97-47f6-9509-91dedcfc64ba/resource/dc61422d-8376-4678-8cd9-deba17ad2f0b/download/r8_r8.10r9.3.csv",
  },
  {
    id: "kasuga",
    name: "Kasuga City",
    prefectureId: "fukuoka",
    city: "Kasuga",
    adapter: "standard",
    ckanId: "a830bc29-1d5c-47ba-8b04-22442a64cde2",
    pageUrl: "https://data.bodik.jp/dataset/a830bc29-1d5c-47ba-8b04-22442a64cde2",
    csvUrl: "https://data.bodik.jp/dataset/a830bc29-1d5c-47ba-8b04-22442a64cde2/resource/832c3ad1-bb71-4675-b86c-42cdff645d75/download/402184_event_20250609.csv",
  },
  {
    id: "aso",
    name: "Aso City",
    prefectureId: "kumamoto",
    city: "Aso",
    adapter: "standard",
    ckanId: "6689507e-cb93-404f-bb53-4c5f1e797a40",
    pageUrl: "https://data.bodik.jp/dataset/6689507e-cb93-404f-bb53-4c5f1e797a40",
    csvUrl: "https://data.bodik.jp/dataset/6689507e-cb93-404f-bb53-4c5f1e797a40/resource/b6c912c0-8a79-4370-a5e9-437ab21a6ccc/download/432148_event.csv",
  },
  {
    id: "kumatori",
    name: "Kumatori Town",
    prefectureId: "osaka",
    city: "Kumatori",
    adapter: "standard",
    ckanId: "1fa97779-568e-4b59-a543-0ea191d363e8",
    pageUrl: "https://data.bodik.jp/dataset/1fa97779-568e-4b59-a543-0ea191d363e8",
    csvUrl: "https://data.bodik.jp/dataset/1fa97779-568e-4b59-a543-0ea191d363e8/resource/2f142e50-67f1-4aee-b430-bd8d63f336eb/download/273619_event.csv",
  },
  {
    id: "kadoma",
    name: "Kadoma City",
    prefectureId: "osaka",
    city: "Kadoma",
    adapter: "standard",
    ckanId: "ef30adaf-dda4-4549-9e58-c92b7983c9b3",
    pageUrl: "https://data.bodik.jp/dataset/ef30adaf-dda4-4549-9e58-c92b7983c9b3",
    csvUrl: "https://data.bodik.jp/dataset/ef30adaf-dda4-4549-9e58-c92b7983c9b3/resource/9dbac56f-f261-4178-9824-cfd1326ae0ec/download/272230_event_202504-.csv",
  },
  {
    id: "mooka",
    name: "Mooka City",
    prefectureId: "tochigi",
    city: "Mooka",
    adapter: "standard",
    ckanId: "3f51da57-e3e2-405f-9a3e-84b6d40d6cd3",
    pageUrl: "https://data.bodik.jp/dataset/3f51da57-e3e2-405f-9a3e-84b6d40d6cd3",
    csvUrl: "https://data.bodik.jp/dataset/3f51da57-e3e2-405f-9a3e-84b6d40d6cd3/resource/4ddc5d97-5f72-49b3-9cd1-a46d24f1800d/download/od70142026032700400.csv",
  },
  {
    id: "usa",
    name: "Usa City",
    prefectureId: "oita",
    city: "Usa",
    adapter: "standard",
    ckanId: "72e1d155-6ea8-450e-9559-570b768ab1ab",
    pageUrl: "https://data.bodik.jp/dataset/72e1d155-6ea8-450e-9559-570b768ab1ab",
    csvUrl: "https://data.bodik.jp/dataset/72e1d155-6ea8-450e-9559-570b768ab1ab/resource/3e2f9d2a-fc26-44e6-808b-bc82c5d88cc0/download/442119_event.csv",
  },
  {
    id: "tarumizu",
    name: "Tarumizu City",
    prefectureId: "kagoshima",
    city: "Tarumizu",
    adapter: "standard",
    ckanId: "7b0056f5-0a24-462d-a546-bc20f84ce459",
    pageUrl: "https://data.bodik.jp/dataset/7b0056f5-0a24-462d-a546-bc20f84ce459",
    csvUrl: "https://data.bodik.jp/dataset/7b0056f5-0a24-462d-a546-bc20f84ce459/resource/f7da4fd8-60c4-4c61-ad81-c785000174df/download/462144_event_2026.csv",
  },
  {
    id: "shibushi",
    name: "Shibushi City",
    prefectureId: "kagoshima",
    city: "Shibushi",
    adapter: "standard",
    ckanId: "7b13ce0d-97c7-4935-8071-a0888469b592",
    pageUrl: "https://data.bodik.jp/dataset/7b13ce0d-97c7-4935-8071-a0888469b592",
    csvUrl: "https://data.bodik.jp/dataset/7b13ce0d-97c7-4935-8071-a0888469b592/resource/dca85562-12e6-4d3a-b87f-e1f9e43e8eb1/download/462217_event_2024.csv",
  },
  {
    id: "minato",
    name: "Minato City (Tokyo)",
    prefectureId: "tokyo",
    city: "Minato",
    adapter: "minato",
    pageUrl: "https://opendata.city.minato.tokyo.jp/dataset/abb98f48-76fb-4013-9d7e-d3028830e7f2",
    csvUrl:
      "https://opendata.city.minato.tokyo.jp/dataset/abb98f48-76fb-4013-9d7e-d3028830e7f2/resource/53b60f4a-f39e-41f2-b7a6-41f5c7ab23d3/download/minatokueventjoho.csv",
  },
  {
    id: "machida",
    name: "Machida City (Tokyo)",
    prefectureId: "tokyo",
    city: "Machida",
    adapter: "standard",
    pageUrl: "https://www.city.machida.tokyo.jp/shisei/opendata/",
    csvUrl: "https://www.city.machida.tokyo.jp/shisei/opendata/sangyo/event.files/132098_event.csv",
  },
];

const USER_AGENT = "LiveCityJapan/1.0 (educational project; events aggregator)";
const MAX_BYTES = 6_000_000;
// Events that ended more than this long ago, or start further ahead than the
// second limit, are dropped when a file is read.
const KEEP_PAST_DAYS = 14;
const KEEP_AHEAD_DAYS = 540;

export interface ProviderResult {
  events: EventItem[];
  updatedAt: string | null;
  // False when the provider stopped early to stay inside its time budget.
  complete?: boolean;
}

// How long a request may still take: what is left of the overall budget, but
// never less than a couple of seconds, and never more than `max`.
export function budget(deadline: number, max: number): number {
  return Math.max(2000, Math.min(max, deadline - Date.now()));
}

// ── Reading a file ────────────────────────────────────────────────────────

interface Resolved {
  url: string;
  updatedAt: string | null;
}

// Asks the catalogue (once) for the dataset's newest CSV; falls back to the
// last known file if the catalogue is unreachable.
async function resolveCsv(source: MunicipalSource, deadline: number): Promise<Resolved> {
  if (source.ckanId) {
    try {
      const res = await fetch(`https://data.bodik.jp/api/3/action/package_show?id=${source.ckanId}`, {
        signal: AbortSignal.timeout(budget(deadline, 12000)),
        // Shared across visitors for an hour (see the note on readCsv).
        next: { revalidate: 3600 },
        headers: { "User-Agent": USER_AGENT },
      });
      if (res.ok) {
        const body = (await res.json()) as {
          result?: { metadata_modified?: string; resources?: { format?: string; url?: string; last_modified?: string; created?: string }[] };
        };
        const csvs = (body.result?.resources ?? [])
          .filter((r) => r.format?.toUpperCase() === "CSV" && r.url?.startsWith("https://"))
          .sort((a, b) => (b.last_modified ?? b.created ?? "").localeCompare(a.last_modified ?? a.created ?? ""));
        if (csvs[0]?.url) return { url: csvs[0].url, updatedAt: body.result?.metadata_modified ?? null };
      }
    } catch {
      // fall through to the last known file
    }
  }
  return { url: source.csvUrl, updatedAt: null };
}

// Files on the BODIK portal go through Next's shared data cache for six hours,
// so however many visitors there are (and however often the server restarts)
// the portal is asked for each file about four times a day. Files on a city's
// own server can be large (over the cache's 2 MB limit), so those are read
// directly — they are still held in memory by the aggregator.
function isShared(url: string): boolean {
  return new URL(url).hostname === "data.bodik.jp";
}

async function readCsv(url: string, deadline: number): Promise<{ rows: string[][]; lastModified: string | null }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(budget(deadline, 25000)),
    ...(isShared(url) ? { next: { revalidate: 21600 } } : { cache: "no-store" as const }),
    headers: { "User-Agent": USER_AGENT, Accept: "text/csv, text/plain, */*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) throw new Error("File too large");
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) throw new Error("File too large");
  const lm = res.headers.get("last-modified");
  return { rows: parseCsv(decodeCsv(bytes)), lastModified: lm ? new Date(lm).toISOString() : null };
}

// ── Turning rows into events ──────────────────────────────────────────────

type Header = string[];

function find(header: Header, ...patterns: RegExp[]): number {
  for (const re of patterns) {
    const i = header.findIndex((h) => re.test(h.trim()));
    if (i >= 0) return i;
  }
  return -1;
}

function cell(row: string[], index: number): string {
  return index >= 0 && index < row.length ? row[index].trim() : "";
}

// Links to the publisher's page: http or https.
function link(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function prefectureFrom(text: string, fallback: string): string {
  const hit = PREFECTURES.find((p) => text.includes(p.ja));
  return hit?.id ?? fallback;
}

function coords(lat: string, lon: string): { lat: number | null; lon: number | null } {
  const a = Number(lat);
  const b = Number(lon);
  return Number.isFinite(a) && Number.isFinite(b) && inJapan(a, b) ? { lat: a, lon: b } : { lat: null, lon: null };
}

function shorten(text: string, max = 280): string | null {
  const clean = toPlainText(text);
  if (clean.length < 8) return null;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf(". "));
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.trim()}…`;
}

function eventId(sourceId: string, title: string, start: string): string {
  return createHash("sha1").update(`${sourceId}|${title}|${start}`).digest("base64url").slice(0, 12);
}

function inWindow(ranges: DateRange[], today: string): boolean {
  if (ranges.length === 0) return false;
  const last = ranges[ranges.length - 1].end;
  const first = ranges[0].start;
  return last >= addDays(today, -KEEP_PAST_DAYS) && first <= addDays(today, KEEP_AHEAD_DAYS);
}

function standardEvents(source: MunicipalSource, header: Header, rows: string[][], ctx: Ctx): EventItem[] {
  const i = {
    title: find(header, /^イベント名$/, /^(イベント|行事|催し|祭り?)名/, /^名称$/, /^name$/i),
    start: find(header, /^開始日$/, /^開催日$/, /^開始年月日$/),
    end: find(header, /^終了日$/, /^終了年月日$/),
    startTime: find(header, /^開始時間$/, /^開始時刻$/),
    endTime: find(header, /^終了時間$/, /^終了時刻$/),
    note: find(header, /^開始日時特記事項$/, /^開催期間.*備考/),
    venue: find(header, /^場所名称$/, /^開催場所/, /^場所$/, /^会場/),
    address: find(header, /^所在地_連結表記$/, /^住所$/, /^所在地$/),
    pref: find(header, /^所在地_都道府県$/),
    city: find(header, /^所在地_市区町村$/, /^市区町村名$/),
    lat: find(header, /^緯度$/, /緯度/),
    lon: find(header, /^経度$/, /経度/),
    desc: find(header, /^説明$/, /^概要$/),
    summary: find(header, /^概要$/),
    url: find(header, /^コンテンツURL$/, /^URL$/),
    organizer: find(header, /^主催者$/),
    price: find(header, /^料金[(（]基本[)）]$/, /^料金$/, /^費用$/),
    priceDetail: find(header, /^料金[(（]詳細[)）]$/),
    target: find(header, /^対象者$/),
    image: find(header, /^画像$/),
    imageLicence: find(header, /^画像_ライセンス$/),
    status: find(header, /^状態$/),
    posted: find(header, /^掲載開始日$/),
    type: find(header, /^イベント種類$/),
    keywords: find(header, /^キーワード$/, /^タグ$/),
  };
  if (i.title < 0 || i.start < 0) throw new Error("Unrecognised column layout");

  const out: EventItem[] = [];
  for (const row of rows) {
    const title = toPlainText(cell(row, i.title));
    const start = parseDate(cell(row, i.start));
    if (!title || !start) continue;
    let end = parseDate(cell(row, i.end)) ?? start;
    if (end < start) end = start;
    const ranges = [{ start, end }];
    if (!inWindow(ranges, ctx.today)) continue;

    const description = shorten(cell(row, i.desc) || cell(row, i.summary));
    const hintText = `${title} ${cell(row, i.type)} ${cell(row, i.keywords)} ${description ?? ""}`;
    const place = `${cell(row, i.pref)}${cell(row, i.address)}`;
    const { lat, lon } = coords(cell(row, i.lat), cell(row, i.lon));
    const imageUrl = cell(row, i.image);
    const safeImage = /^https:\/\//.test(imageUrl) ? imageUrl : null;
    const posted = parseDate(cell(row, i.posted));
    const priceText = [cell(row, i.price), cell(row, i.priceDetail)].filter(Boolean).join(" ");

    out.push({
      id: eventId(source.id, title, start),
      title,
      kind: classifyKind(hintText, "community"),
      status: statusFromText(cell(row, i.status), title),
      ranges,
      startTime: parseTime(cell(row, i.startTime)),
      endTime: parseTime(cell(row, i.endTime)),
      dateNote: shorten(cell(row, i.note), 160),
      venue: cell(row, i.venue) || null,
      address: cell(row, i.address) || null,
      prefectureId: prefectureFrom(place, source.prefectureId),
      city: cell(row, i.city) || source.city,
      lat,
      lon,
      locationApprox: false,
      description,
      url: link(cell(row, i.url)),
      organizer: cell(row, i.organizer) || null,
      price: parsePrice(priceText),
      familyFriendly: looksFamilyFriendly(`${hintText} ${cell(row, i.target)}`),
      image: safeImage
        ? {
            url: safeImage,
            credit: source.name,
            licence: cell(row, i.imageLicence) || null,
            pageUrl: link(cell(row, i.url)),
          }
        : null,
      source: ctx.source,
      announcedAt: posted,
      sourceUpdatedAt: ctx.updatedAt,
      typicalDates: false,
    });
  }
  return out;
}

// Minato City publishes its own layout: one free-text schedule per event.
function minatoEvents(source: MunicipalSource, header: Header, rows: string[][], ctx: Ctx): EventItem[] {
  const i = {
    title: find(header, /^ページタイトル$/),
    when: find(header, /^開催日時$/),
    url: find(header, /^ページURL$/),
    kind1: find(header, /^第1分類$/),
    kind2: find(header, /^第2分類$/),
    desc: find(header, /^内容$/),
    target: find(header, /^対象$/),
    detail: find(header, /^開催日詳細$/),
    venue: find(header, /^ところ$/),
    price: find(header, /^費用$/),
    contact: find(header, /^問い合わせ先1$/),
    lat: find(header, /^緯度$/),
    lon: find(header, /^経度$/),
  };
  if (i.title < 0 || i.when < 0) throw new Error("Unrecognised column layout");

  const out: EventItem[] = [];
  for (const row of rows) {
    const title = toPlainText(cell(row, i.title));
    const ranges = parseRanges(cell(row, i.when));
    if (!title || !inWindow(ranges, ctx.today)) continue;
    const description = shorten(cell(row, i.desc));
    const hintText = `${title} ${cell(row, i.kind1)} ${cell(row, i.kind2)} ${description ?? ""}`;
    const { lat, lon } = coords(cell(row, i.lat), cell(row, i.lon));
    out.push({
      id: eventId(source.id, title, ranges[0].start),
      title,
      kind: classifyKind(hintText, "community"),
      status: statusFromText(title),
      ranges,
      startTime: null,
      endTime: null,
      dateNote: shorten(cell(row, i.detail), 160),
      venue: shorten(cell(row, i.venue), 120),
      address: null,
      prefectureId: source.prefectureId,
      city: source.city,
      lat,
      lon,
      locationApprox: false,
      description,
      url: link(cell(row, i.url)),
      organizer: shorten(cell(row, i.contact), 100),
      price: parsePrice(cell(row, i.price)),
      familyFriendly: looksFamilyFriendly(`${hintText} ${cell(row, i.target)}`),
      image: null,
      source: ctx.source,
      announcedAt: null,
      sourceUpdatedAt: ctx.updatedAt,
      typicalDates: false,
    });
  }
  return out;
}

interface Ctx {
  today: string;
  source: EventSource;
  updatedAt: string | null;
}

export async function fetchMunicipal(source: MunicipalSource, deadline: number): Promise<ProviderResult> {
  const resolved = await resolveCsv(source, deadline);
  const { rows, lastModified } = await readCsv(resolved.url, deadline);
  if (rows.length < 2) return { events: [], updatedAt: resolved.updatedAt ?? lastModified };

  const updatedAt = resolved.updatedAt ?? lastModified;
  const ctx: Ctx = {
    today: jstDate(),
    updatedAt,
    source: { id: source.id, name: source.name, type: "municipal-open-data", url: source.pageUrl },
  };
  const [header, ...body] = rows;
  const events = source.adapter === "minato" ? minatoEvents(source, header, body, ctx) : standardEvents(source, header, body, ctx);
  return { events, updatedAt };
}

// Exposed for tests of the date reader.
export { findDates };
