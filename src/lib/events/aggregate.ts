import { fetchMunicipal, MUNICIPAL_SOURCES, type MunicipalSource } from "@/lib/events/municipal";
import { fetchReference, supersededByOfficial } from "@/lib/events/reference";
import { jstDate } from "@/lib/events/time";
import type { EventItem, SourceStatus } from "@/lib/events/types";

export interface EventsSnapshot {
  events: EventItem[];
  sources: SourceStatus[];
  // True when some sources were left for the next request (time budget).
  incomplete: boolean;
  // When the data was actually retrieved — shown to readers, not "live".
  fetchedAt: number;
}

// Municipal lists change a few times a week at most, and are fetched from
// small public servers, so they are refreshed rarely and shared by everyone.
const TTL_MS = 6 * 60 * 60 * 1000;
const FAILED_RETRY_MS = 3 * 60 * 1000;
// A request may be cut off after about ten seconds on a free hosting plan, so a
// build stops starting new sources after this long and lets the next request
// carry on (files already fetched come back instantly from the shared cache).
const BUILD_BUDGET_MS = Number(process.env.EVENTS_BUILD_BUDGET_MS) || 8000;
const INCOMPLETE_RETRY_MS = 20 * 1000;

// "Same event" for the purposes of removing repeats: the same title on the
// same day, ignoring spacing, punctuation and width of characters.
function titleKey(title: string): string {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function richness(e: EventItem): number {
  return (e.image ? 2 : 0) + (e.description ? 1 : 0) + (e.lat !== null ? 1 : 0) + (e.venue ? 1 : 0);
}

export function dedupe(events: EventItem[]): EventItem[] {
  const byKey = new Map<string, EventItem>();
  for (const e of events) {
    const key = `${titleKey(e.title)}|${e.ranges[0].start}|${e.prefectureId ?? ""}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, e);
    } else {
      const [best, other] = richness(e) > richness(existing) ? [e, existing] : [existing, e];
      byKey.set(key, {
        ...best,
        image: best.image ?? other.image,
        description: best.description ?? other.description,
        venue: best.venue ?? other.venue,
        url: best.url ?? other.url,
        lat: best.lat ?? other.lat,
        lon: best.lon ?? other.lon,
        locationApprox: best.lat !== null ? best.locationApprox : other.locationApprox,
        announcedAt: best.announcedAt ?? other.announcedAt,
      });
    }
  }
  return [...byKey.values()];
}

async function build(): Promise<EventsSnapshot> {
  const checkedAt = Date.now();
  const deadline = checkedAt + BUILD_BUDGET_MS;
  let incomplete = false;
  const today = jstDate();
  const events: EventItem[] = [];
  const sources: SourceStatus[] = [];

  // Municipal lists. Each publisher's server gets one request at a time, with a
  // pause between them — the BODIK portal in particular refuses bursts.
  const byHost = new Map<string, MunicipalSource[]>();
  for (const source of MUNICIPAL_SOURCES) {
    const host = new URL(source.csvUrl).hostname;
    byHost.set(host, [...(byHost.get(host) ?? []), source]);
  }
  // Hosts to leave alone in this environment (EVENTS_SKIP_HOSTS="a.example,b.example"),
  // e.g. while developing, so a publisher's server isn't hit on every reload.
  const skipHosts = (process.env.EVENTS_SKIP_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);

  async function readHost(host: string, list: MunicipalSource[]) {
    const pause = host === "data.bodik.jp" ? 1200 : 250;
    for (const source of list) {
      if (Date.now() > deadline - 1500) {
        incomplete = true;
        sources.push({ id: source.id, name: source.name, type: "municipal-open-data", ok: false, count: 0, updatedAt: null, checkedAt, error: "Still loading — will appear shortly" });
        continue;
      }
      if (skipHosts.includes(host)) {
        sources.push({ id: source.id, name: source.name, type: "municipal-open-data", ok: false, count: 0, updatedAt: null, checkedAt, error: "Not checked in this environment" });
        continue;
      }
      try {
        const result = await fetchMunicipal(source, deadline);
        const current = result.events.filter((e) => e.ranges[e.ranges.length - 1].end >= today);
        events.push(...result.events);
        sources.push({ id: source.id, name: source.name, type: "municipal-open-data", ok: true, count: current.length, updatedAt: result.updatedAt, checkedAt });
      } catch (error) {
        sources.push({
          id: source.id,
          name: source.name,
          type: "municipal-open-data",
          ok: false,
          count: 0,
          updatedAt: null,
          checkedAt,
          error: error instanceof Error ? error.message : "Request failed",
        });
      }
      await new Promise((r) => setTimeout(r, pause));
    }
  }
  await Promise.all([...byHost.entries()].map(([host, list]) => readHost(host, list)));

  // The annual reference calendar.
  try {
    const reference = await fetchReference(deadline);
    if (reference.complete === false) incomplete = true;
    const official = events;
    const kept = reference.events.filter((r) => !supersededByOfficial(r, official));
    events.push(...kept);
    sources.push({ id: "annual-reference", name: "Annual festival calendar", type: "annual-reference", ok: true, count: kept.length, updatedAt: null, checkedAt });
  } catch (error) {
    sources.push({
      id: "annual-reference",
      name: "Annual festival calendar",
      type: "annual-reference",
      ok: false,
      count: 0,
      updatedAt: null,
      checkedAt,
      error: error instanceof Error ? error.message : "Request failed",
    });
  }

  sources.sort((a, b) => a.name.localeCompare(b.name));
  return { events: dedupe(events), sources, incomplete, fetchedAt: checkedAt };
}

let snapshot: EventsSnapshot | null = null;
let inflight: Promise<EventsSnapshot> | null = null;

function refresh(): Promise<EventsSnapshot> {
  inflight ??= build()
    .then((fresh) => {
      // If every provider failed, keep the last good events (with the new
      // failure notes) rather than blanking the page.
      if (fresh.events.length > 0 || !snapshot) snapshot = fresh;
      else snapshot = { ...snapshot, sources: fresh.sources };
      return snapshot;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function getEventsSnapshot(): Promise<EventsSnapshot> {
  const anyFailed = snapshot?.sources.some((s) => !s.ok) ?? false;
  const ttl = snapshot?.incomplete
    ? INCOMPLETE_RETRY_MS
    : snapshot && (snapshot.events.length === 0 || anyFailed)
      ? FAILED_RETRY_MS * (snapshot.events.length === 0 ? 1 : 20)
      : TTL_MS;
  if (snapshot && Date.now() - snapshot.fetchedAt < ttl) return snapshot;
  if (snapshot) {
    void refresh();
    return snapshot;
  }
  return refresh();
}

export async function findEvent(id: string): Promise<EventItem | null> {
  return (await getEventsSnapshot()).events.find((e) => e.id === id) ?? null;
}
