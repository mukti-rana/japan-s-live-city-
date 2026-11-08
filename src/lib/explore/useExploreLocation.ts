"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { haversineKm, PREFECTURE_CENTER } from "@/lib/events/geo";
import { MAP_CITIES } from "@/lib/map/cities";
import { PREFECTURES, resolvePlace } from "@/lib/news/places";

// Where the visitor is exploring from. Two kinds, always labelled as such:
//   • "gps"    — their device's position, requested only when they press
//                "Use my location". Kept for this browser session only.
//   • "manual" — a city or prefecture they picked. Remembered on this device;
//                its position is that place's centre, not where they are.

export interface ExploreLocation {
  mode: "gps" | "manual";
  lat: number;
  lon: number;
  // How precise the position is, in km (gps only).
  accuracyKm: number | null;
  label: string;
  prefectureId: string | null;
  // For a picked place: a city, or a whole prefecture (centred on its middle).
  kind?: "city" | "prefecture";
  // When it was set, so the more recent of the two wins as "the" location.
  at?: number;
}

const MANUAL_KEY = "livecity:exploreLocation";
const GPS_KEY = "livecity:exploreGps";
const EVENT = "livecity:explorelocation";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function read(storage: Storage | null, key: string): string {
  try {
    return storage?.getItem(key) ?? "";
  } catch {
    return "";
  }
}

// One string so useSyncExternalStore can compare snapshots cheaply.
function snapshot(): string {
  return `${read(window.sessionStorage, GPS_KEY)}\n${read(window.localStorage, MANUAL_KEY)}`;
}

function parseOne(text: string | undefined, mode: "gps" | "manual"): ExploreLocation | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as ExploreLocation;
    if (Number.isFinite(v.lat) && Number.isFinite(v.lon) && v.mode === mode) return v;
  } catch {
    /* ignore a corrupt entry */
  }
  return null;
}

function nearestPrefecture(lat: number, lon: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const p of PREFECTURES) {
    const c = PREFECTURE_CENTER[p.id];
    if (!c) continue;
    const d = haversineKm(lat, lon, c[0], c[1]);
    if (d < bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return bestD < 250 ? best : null;
}

export type LocateStatus = "idle" | "locating" | "denied" | "unavailable" | "outside";

export function useExploreLocation() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  // The device position and the picked place are kept apart so a page can
  // offer both ("Near Me" vs "Choose City"); `location` is whichever was set last.
  const { gps, manual, location } = useMemo(() => {
    const [g, m] = raw.split("\n");
    const gps = parseOne(g, "gps");
    const manual = parseOne(m, "manual");
    const location = gps && manual ? ((gps.at ?? 0) >= (manual.at ?? 0) ? gps : manual) : (gps ?? manual);
    return { gps, manual, location };
  }, [raw]);
  const [status, setStatus] = useState<LocateStatus>("idle");

  const save = useCallback((storage: Storage, key: string, value: ExploreLocation | null) => {
    try {
      if (value) storage.setItem(key, JSON.stringify(value));
      else storage.removeItem(key);
    } catch {
      /* storage unavailable — the choice just lasts until reload */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  // Asked for only when the visitor presses the button.
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        if (lat < 24 || lat > 46 || lon < 122 || lon > 149) {
          setStatus("outside");
          return;
        }
        // The city's name comes from the same free reverse-geocoder the Home page uses.
        let name: string | null = null;
        try {
          const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          if (r.ok) {
            const g = (await r.json()) as { city?: string; locality?: string; principalSubdivision?: string };
            name = g.city || g.locality || g.principalSubdivision || null;
          }
        } catch {
          /* the label falls back to the prefecture below */
        }
        const prefectureId = resolvePlace(name)?.prefectureId ?? nearestPrefecture(lat, lon);
        const prefName = PREFECTURES.find((p) => p.id === prefectureId)?.en ?? null;
        save(window.sessionStorage, GPS_KEY, {
          mode: "gps",
          lat,
          lon,
          accuracyKm: Math.round((accuracy / 1000) * 10) / 10,
          label: name ?? prefName ?? "your area",
          prefectureId,
          at: Date.now(),
        });
        setStatus("idle");
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, [save]);

  // A city or prefecture picked by hand.
  const choosePlace = useCallback(
    (kind: "city" | "prefecture", id: string) => {
      let loc: ExploreLocation | null = null;
      if (kind === "city") {
        const c = MAP_CITIES.find((x) => x.slug === id);
        if (c) loc = { mode: "manual", lat: c.lat, lon: c.lon, accuracyKm: null, label: c.name, prefectureId: c.prefectureId, kind: "city", at: Date.now() };
      } else {
        const p = PREFECTURES.find((x) => x.id === id);
        const centre = PREFECTURE_CENTER[id];
        if (p && centre) loc = { mode: "manual", lat: centre[0], lon: centre[1], accuracyKm: null, label: p.en, prefectureId: p.id, kind: "prefecture", at: Date.now() };
      }
      if (!loc) return;
      save(window.localStorage, MANUAL_KEY, loc);
      setStatus("idle");
    },
    [save],
  );

  const clear = useCallback(() => {
    save(window.sessionStorage, GPS_KEY, null);
    save(window.localStorage, MANUAL_KEY, null);
    setStatus("idle");
  }, [save]);

  // If the visitor already allowed location for this site, use it straight
  // away — the browser shows no prompt in that case, so nothing is asked
  // unexpectedly. Otherwise they press "Use my location" once.
  const hasGps = Boolean(gps);
  const locateNow = useMyLocation;
  useEffect(() => {
    if (hasGps || typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((r) => {
        if (!cancelled && r.state === "granted") locateNow();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasGps, locateNow]);

  return { location, gps, manual, status, useMyLocation, choosePlace, clear };
}
