// Real live earthquake data from the P2P Quake API — a free, keyless relay
// of official JMA (Japan Meteorological Agency) seismic bulletins.
// https://www.p2pquake.net/en/

import { haversineKm } from "@/lib/events/geo";

const SHINDO_LABELS: Record<number, string> = {
  10: "1",
  20: "2",
  30: "3",
  40: "4",
  45: "5-",
  50: "5+",
  55: "6-",
  60: "6+",
  70: "7",
};

const TSUNAMI_LABELS: Record<string, string> = {
  None: "No tsunami risk",
  Unknown: "Tsunami status unknown",
  Checking: "Checking for tsunami risk",
  NonEffective: "No significant tsunami expected",
  Watch: "Tsunami advisory issued",
  Warning: "Tsunami warning issued",
  MajorWarning: "Major tsunami warning issued",
};

export interface EarthquakeEvent {
  id: string;
  location: string;
  magnitude: number;
  depthKm: number;
  maxIntensity: string;
  tsunami: string;
  tsunamiCode: string;
  time: string;
}

interface P2PQuakeItem {
  id: string;
  earthquake: {
    hypocenter: { name: string; magnitude: number; depth: number };
    maxScale: number;
    domesticTsunami: string;
    time: string;
  };
}

export async function getRecentEarthquakes(limit = 8): Promise<EarthquakeEvent[]> {
  const res = await fetch(
    `https://api.p2pquake.net/v2/history?codes=551&limit=30`,
    { next: { revalidate: 300 } },
  );

  if (!res.ok) {
    throw new Error(`P2P Quake API responded with ${res.status}`);
  }

  const data = (await res.json()) as P2PQuakeItem[];

  return data
    .filter(
      (item) =>
        item.earthquake?.hypocenter?.magnitude > 0 &&
        item.earthquake.maxScale >= 0,
    )
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      location: item.earthquake.hypocenter.name || "Unknown location",
      magnitude: item.earthquake.hypocenter.magnitude,
      depthKm: item.earthquake.hypocenter.depth,
      maxIntensity: SHINDO_LABELS[item.earthquake.maxScale] ?? "—",
      tsunami:
        TSUNAMI_LABELS[item.earthquake.domesticTsunami] ??
        item.earthquake.domesticTsunami,
      tsunamiCode: item.earthquake.domesticTsunami,
      time: item.earthquake.time,
    }));
}

// ── Earthquakes near a place ─────────────────────────────────────────────
// P2P Quake's history also says where each earthquake was felt (prefecture
// and town, with the shindo there) and where it began. From that: the latest
// earthquake FELT in the visitor's prefecture, else the latest that began
// within 100 km of them, within the last 7 days — and always the latest in
// Japan as the fallback. Nothing is estimated.

export interface NearbyQuake extends EarthquakeEvent {
  // "felt": reported in the visitor's prefecture; "near": began close by.
  relation: "felt" | "near";
  feltScale: string | null;
  feltPlace: string | null;
  distanceKm: number | null;
}

interface P2PFull extends P2PQuakeItem {
  earthquake: P2PQuakeItem["earthquake"] & { hypocenter: { name: string; magnitude: number; depth: number; latitude?: number; longitude?: number } };
  points?: { pref: string; addr: string; scale: number }[];
}

const WEEK_MS = 7 * 24 * 3600_000;
const NEAR_KM = 100;

const jst = (t: string) => new Date(`${t.replace(/\//g, "-").replace(" ", "T").slice(0, 19)}+09:00`).getTime();

export async function getQuakeFeed(opts: { prefJa?: string | null; lat?: number | null; lon?: number | null }): Promise<{ mine: NearbyQuake | null; latest: EarthquakeEvent | null }> {
  // Two pages of 100 reach back about two weeks.
  const pages = await Promise.all(
    [0, 100].map((offset) =>
      fetch(`https://api.p2pquake.net/v2/history?codes=551&limit=100&offset=${offset}`, { next: { revalidate: 300 } })
        .then((r) => (r.ok ? (r.json() as Promise<P2PFull[]>) : []))
        .catch(() => [] as P2PFull[]),
    ),
  );
  const seen = new Set<string>();
  const items = pages
    .flat()
    // Complete reports only (with magnitude and an epicentre name), once each.
    .filter((i) => i.earthquake?.hypocenter?.magnitude > 0 && i.earthquake.hypocenter.name && i.earthquake.maxScale >= 0)
    .filter((i) => {
      const key = `${i.earthquake.time}|${i.earthquake.hypocenter.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => jst(b.earthquake.time) - jst(a.earthquake.time));

  const toEvent = (i: P2PFull): EarthquakeEvent => ({
    id: i.id,
    location: i.earthquake.hypocenter.name,
    magnitude: i.earthquake.hypocenter.magnitude,
    depthKm: i.earthquake.hypocenter.depth,
    maxIntensity: SHINDO_LABELS[i.earthquake.maxScale] ?? "—",
    tsunami: TSUNAMI_LABELS[i.earthquake.domesticTsunami] ?? i.earthquake.domesticTsunami,
    tsunamiCode: i.earthquake.domesticTsunami,
    time: i.earthquake.time,
  });

  const since = Date.now() - WEEK_MS;
  let mine: NearbyQuake | null = null;
  for (const i of items) {
    if (jst(i.earthquake.time) < since) break;
    const here = opts.prefJa ? (i.points ?? []).filter((p) => p.pref.startsWith(opts.prefJa as string)) : [];
    if (here.length > 0) {
      const strongest = here.reduce((a, b) => (b.scale > a.scale ? b : a));
      mine = { ...toEvent(i), relation: "felt", feltScale: SHINDO_LABELS[strongest.scale] ?? null, feltPlace: strongest.addr || null, distanceKm: null };
      break;
    }
  }
  if (!mine && opts.lat != null && opts.lon != null) {
    for (const i of items) {
      if (jst(i.earthquake.time) < since) break;
      const h = i.earthquake.hypocenter;
      if (h.latitude == null || h.longitude == null) continue;
      const km = haversineKm(opts.lat, opts.lon, h.latitude, h.longitude);
      if (km <= NEAR_KM) {
        mine = { ...toEvent(i), relation: "near", feltScale: null, feltPlace: null, distanceKm: Math.round(km) };
        break;
      }
    }
  }
  return { mine, latest: items[0] ? toEvent(items[0]) : null };
}
