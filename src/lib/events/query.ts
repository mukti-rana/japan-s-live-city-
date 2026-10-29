import { getEventsSnapshot } from "@/lib/events/aggregate";
import { haversineKm, PREFECTURE_CENTER } from "@/lib/events/geo";
import { addDays, daysBetween, endOfMonth, isDate, jstDate, weekendRange } from "@/lib/events/time";
import type { DateRange, EventItem, EventKind, SourceStatus } from "@/lib/events/types";
import { resolvePlace, type ResolvedPlace } from "@/lib/news/places";

export type When = "all" | "today" | "tomorrow" | "weekend" | "7d" | "month";
export type Sort = "date" | "announced" | "nearest";
export type Phase = "now" | "upcoming" | "ended";

export interface EventsQuery {
  when?: string;
  // A single chosen day, "YYYY-MM-DD" (Japan time).
  date?: string;
  // A custom window (at most 62 days), used by the calendar.
  from?: string;
  to?: string;
  kind?: string;
  pref?: string;
  city?: string;
  q?: string;
  free?: boolean;
  family?: boolean;
  // Place *name* for "Near you". Never coordinates.
  near?: string;
  // Kilometres from the centre of that place, for events with coordinates.
  radius?: number;
  sort?: string;
  // "active" (default): happening now or coming up. "ended": ended in the last two weeks.
  status?: string;
  // Specific events (saved by the visitor), comma-separated ids.
  ids?: string;
  offset?: number;
  limit?: number;
}

export interface EventView extends EventItem {
  phase: Phase;
  // Days until it starts (0 = today). Only for upcoming events.
  daysUntil: number | null;
  // The date range the phase refers to (the next one for multi-date events).
  current: DateRange;
  distanceKm: number | null;
}

export interface EventsResult {
  items: EventView[];
  total: number;
  nextOffset: number | null;
  fetchedAt: number;
  ageMs: number;
  today: string;
  sources: SourceStatus[];
  needsPlace: boolean;
  place: ResolvedPlace | null;
  // Events from a source that is real-time data vs. the typical-date calendar.
  confirmedTotal: number;
}

const KINDS: EventKind[] = ["festival", "fireworks", "music", "food", "culture", "art", "sports", "community", "other"];
const MAX_LIMIT = 30;
const MAX_RANGE_LIMIT = 100;
const MAX_RANGE_DAYS = 62;
const RADII = [10, 25, 50, 100, 200];

function currentRange(e: EventItem, today: string): DateRange {
  return e.ranges.find((r) => r.end >= today) ?? e.ranges[e.ranges.length - 1];
}

function phaseOf(range: DateRange, today: string): Phase {
  if (range.end < today) return "ended";
  return range.start <= today ? "now" : "upcoming";
}

function windowFor(query: EventsQuery, today: string): DateRange | null {
  if (isDate(query.date)) return { start: query.date, end: query.date };
  if (isDate(query.from) && isDate(query.to) && query.to >= query.from && daysBetween(query.from, query.to) <= MAX_RANGE_DAYS) {
    return { start: query.from, end: query.to };
  }
  switch (query.when as When) {
    case "today":
      return { start: today, end: today };
    case "tomorrow":
      return { start: addDays(today, 1), end: addDays(today, 1) };
    case "weekend":
      return weekendRange(today);
    case "7d":
      return { start: today, end: addDays(today, 7) };
    case "month":
      return { start: today, end: endOfMonth(today) };
    default:
      return null;
  }
}

function placeCenter(place: ResolvedPlace): [number, number] | null {
  return PREFECTURE_CENTER[place.prefectureId] ?? null;
}

export async function queryEvents(query: EventsQuery): Promise<EventsResult> {
  const snapshot = await getEventsSnapshot();
  const today = jstDate();
  const ended = query.status === "ended";
  const window = windowFor(query, today);
  const kinds = new Set((query.kind ?? "").split(",").filter((k): k is EventKind => KINDS.includes(k as EventKind)));
  const needle = query.q?.trim().toLowerCase();
  const cityNeedle = query.city?.trim().toLowerCase();
  const place = query.near ? resolvePlace(query.near) : null;
  const center = place ? placeCenter(place) : null;
  const radius = query.radius && RADII.includes(query.radius) ? query.radius : 0;
  const nearMode = query.near !== undefined && query.near !== "";

  const wanted = query.ids ? new Set(query.ids.split(",").filter((id) => /^[\w-]{6,60}$/.test(id)).slice(0, 40)) : null;

  const items: EventView[] = [];
  // "Near you" with a place we can't place: return nothing and say so, rather
  // than quietly showing events from everywhere.
  for (const event of nearMode && !place ? [] : snapshot.events) {
    if (wanted && !wanted.has(event.id)) continue;
    const current = currentRange(event, today);
    const phase = phaseOf(current, today);

    // Saved events are shown whatever their phase, so one that has ended is
    // still there to look back on.
    if (!wanted) {
      if (ended) {
        if (phase !== "ended" || current.end < addDays(today, -14)) continue;
      } else if (phase === "ended") {
        continue;
      }
    }

    if (kinds.size > 0 && !kinds.has(event.kind)) continue;
    if (query.pref && event.prefectureId !== query.pref) continue;
    if (cityNeedle && !`${event.city ?? ""} ${event.venue ?? ""} ${event.address ?? ""}`.toLowerCase().includes(cityNeedle)) continue;
    if (query.free && event.price.free !== true) continue;
    if (query.family && !event.familyFriendly) continue;
    if (needle && !`${event.title} ${event.description ?? ""} ${event.venue ?? ""} ${event.city ?? ""}`.toLowerCase().includes(needle)) continue;
    if (window && !event.ranges.some((r) => r.start <= window.end && r.end >= window.start)) continue;

    let distanceKm: number | null = null;
    if (center && event.lat !== null && event.lon !== null) {
      distanceKm = Math.round(haversineKm(center[0], center[1], event.lat, event.lon));
    }
    if (nearMode && place) {
      // "Near you": the same prefecture, or — for events whose position we
      // know — within the chosen distance.
      const samePrefecture = event.prefectureId === place.prefectureId;
      const withinRadius = radius > 0 && distanceKm !== null && distanceKm <= radius;
      if (!samePrefecture && !withinRadius) continue;
      if (radius > 0 && distanceKm !== null && distanceKm > radius) continue;
    }

    items.push({
      ...event,
      phase,
      daysUntil: phase === "upcoming" ? daysBetween(today, current.start) : null,
      current,
      distanceKm,
    });
  }

  const sort = (query.sort as Sort) ?? "date";
  items.sort((a, b) => {
    if (ended) return b.current.end.localeCompare(a.current.end);
    if (sort === "announced") {
      const A = a.announcedAt ?? a.sourceUpdatedAt ?? "";
      const B = b.announcedAt ?? b.sourceUpdatedAt ?? "";
      if (A !== B) return B.localeCompare(A);
    } else if (sort === "nearest") {
      const A = a.distanceKm ?? (a.prefectureId === place?.prefectureId ? 5000 : 9999);
      const B = b.distanceKm ?? (b.prefectureId === place?.prefectureId ? 5000 : 9999);
      if (A !== B) return A - B;
    }
    // Default: soonest first. An event already under way ranks as "today" if
    // it is short, but one that has been running for weeks (a months-long
    // course, say) ranks as if it began in two weeks, so it doesn't push
    // events starting this week off the top.
    //
    // City offices publish many classes and consultations alongside real
    // festivals and shows. So that the page leads with what people come here
    // for, a class or consultation ("community"/"other") is ranked as if it
    // were ten days later than its actual date. It is still listed, and the
    // order by date is exact within each group.
    const keyOf = (e: EventView) => {
      const base = e.phase !== "now" ? e.current.start : daysBetween(e.current.start, e.current.end) > 14 ? addDays(today, 14) : today;
      return e.kind === "community" || e.kind === "other" ? addDays(base, 10) : base;
    };
    return keyOf(a).localeCompare(keyOf(b)) || a.current.end.localeCompare(b.current.end) || a.title.localeCompare(b.title);
  });

  const offset = Math.max(0, query.offset ?? 0);
  const cap = window && isDate(query.from) ? MAX_RANGE_LIMIT : MAX_LIMIT;
  const limit = Math.min(cap, Math.max(1, query.limit ?? 12));
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    nextOffset: offset + limit < items.length ? offset + limit : null,
    fetchedAt: snapshot.fetchedAt,
    ageMs: Date.now() - snapshot.fetchedAt,
    today,
    sources: snapshot.sources,
    needsPlace: nearMode ? !place : false,
    place,
    confirmedTotal: items.filter((i) => !i.typicalDates).length,
  };
}

export function eventsQueryFromParams(params: URLSearchParams | Record<string, string | string[] | undefined>): EventsQuery {
  const get = (key: string): string | undefined => {
    const v = params instanceof URLSearchParams ? params.get(key) : params[key];
    const value = Array.isArray(v) ? v[0] : v;
    return value && value.length <= (key === "ids" ? 700 : 120) ? value : undefined;
  };
  const num = (key: string) => {
    const v = Number(get(key));
    return Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined;
  };
  return {
    when: get("when"),
    date: get("date"),
    from: get("from"),
    to: get("to"),
    kind: get("kind"),
    pref: get("pref"),
    city: get("city"),
    q: get("q"),
    free: get("free") === "1",
    family: get("family") === "1",
    near: get("near"),
    radius: num("radius"),
    sort: get("sort"),
    status: get("status"),
    ids: get("ids"),
    offset: num("offset"),
    limit: num("limit"),
  };
}
