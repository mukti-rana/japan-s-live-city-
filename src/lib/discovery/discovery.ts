"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { CategoryId } from "@/lib/explore/categories";
import type { Destination } from "@/lib/explore/types";

// The discovery categories on the Home page. Each is a set of catalogue
// categories (or the "hidden gem" flag), so every chip filters real data.
export interface DiscoveryCategory {
  id: string;
  label: string; // English; translated at display
  cats: CategoryId[];
  hidden?: boolean;
}

export const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  { id: "temples", label: "Shrines & Temples", cats: ["shrine", "temple"] },
  { id: "nature", label: "Nature & Parks", cats: ["park", "waterfall", "beach", "lake", "gorge", "island"] },
  { id: "markets", label: "Markets & Shopping", cats: ["market"] },
  { id: "entertainment", label: "Entertainment", cats: ["themepark", "aquarium", "ski"] },
  { id: "hidden", label: "Hidden Gems", cats: [], hidden: true },
  { id: "photo", label: "Photography Spots", cats: ["viewpoint", "waterfall", "lake"] },
  { id: "history", label: "Historical Places", cats: ["castle", "museum", "attraction", "temple", "shrine"] },
  { id: "family", label: "Family Activities", cats: ["aquarium", "themepark", "park", "beach", "castle"] },
  { id: "unique", label: "Unique Local Experiences", cats: ["onsen", "island", "mountain", "gorge", "ski"] },
];

export type DiscoverySort = "recommended" | "nearest" | "popular";
export const RADII = [5, 10, 25, 50, 100] as const;

export interface DiscoveryPrefs {
  cats: string[]; // chosen DISCOVERY_CATEGORIES ids; empty = everything
  radius: number;
  sort: DiscoverySort;
}

const DEFAULT_PREFS: DiscoveryPrefs = { cats: [], radius: 25, sort: "recommended" };
const KEY = "livecity:discoveryPrefs";
const EVENT = "livecity:discoveryprefs";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const read = (): string => {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

function parse(raw: string): DiscoveryPrefs {
  try {
    const v = JSON.parse(raw) as Partial<DiscoveryPrefs>;
    return {
      cats: Array.isArray(v.cats) ? v.cats.filter((c) => DISCOVERY_CATEGORIES.some((d) => d.id === c)) : [],
      radius: RADII.includes(v.radius as (typeof RADII)[number]) ? (v.radius as number) : DEFAULT_PREFS.radius,
      sort: v.sort === "nearest" || v.sort === "popular" || v.sort === "recommended" ? v.sort : DEFAULT_PREFS.sort,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

// The visitor's discovery choices, remembered on this device.
export function useDiscoveryPrefs() {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const prefs = raw ? parse(raw) : DEFAULT_PREFS;
  const update = useCallback(
    (patch: Partial<DiscoveryPrefs>) => {
      const next = { ...(raw ? parse(raw) : DEFAULT_PREFS), ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — the choice lasts until reload */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [raw],
  );
  return { prefs, update };
}

// Filters → the /api/explore query string.
export function discoveryParams(opts: { lat: number; lon: number; prefs: DiscoveryPrefs; language: string; limit: number; extra?: Record<string, string> }): string {
  const p = new URLSearchParams({
    lat: String(opts.lat),
    lon: String(opts.lon),
    radius: String(opts.prefs.radius),
    sort: opts.prefs.sort,
    limit: String(opts.limit),
    lang: opts.language,
    ...opts.extra,
  });
  const chosen = DISCOVERY_CATEGORIES.filter((c) => opts.prefs.cats.includes(c.id));
  const cats = [...new Set(chosen.flatMap((c) => c.cats))];
  if (cats.length > 0) p.set("cats", cats.join(","));
  // "Hidden gems" on its own narrows to lesser-known places; combined with
  // other chips it widens nothing and the other chips decide.
  if (chosen.some((c) => c.hidden) && cats.length === 0) p.set("hidden", "1");
  return p.toString();
}

// A different place each day among the best few, so Home doesn't show the
// same one every visit. Stable within a day.
export function featuredOf(items: Destination[], dayNumber: number): Destination | null {
  const withPhoto = items.filter((d) => d.image).slice(0, 6);
  const pool = withPhoto.length > 0 ? withPhoto : items.slice(0, 1);
  return pool.length > 0 ? pool[dayNumber % pool.length] : null;
}

export const directionsUrl = (d: Pick<Destination, "lat" | "lon">) => `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lon}`;

// Wikipedia language editions → "popular" only when it's really widespread.
export const WIDELY_KNOWN = 20;
