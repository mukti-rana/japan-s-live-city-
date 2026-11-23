"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { WeatherSnapshot } from "@/lib/services/weather";
import { rememberCity } from "@/lib/geo/sessionCity";

export interface LiveLocation {
  name: string;
  area: string | null;
  countryName: string | null;
}

// "prompt" = the browser has not been asked yet, or the visitor has already been asked once on this visit and did not
// answer: the page then waits for a "Use my location" button. On a first visit it asks by itself (see the provider).
export type LiveLocationStatus = "idle" | "locating" | "ready" | "denied" | "unavailable" | "error" | "prompt";

export interface LiveCoords {
  lat: number;
  lon: number;
  accuracyKm: number;
}

interface ReverseGeocodeResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

// A rough, city-level position taken from the visitor's network address. It exists only for pages that ask for it
// (`network` on the provider) and is filled in only when the exact position is not available. It can be wrong, so
// it must always be shown as approximate.
export interface ApproximateLocation {
  location: LiveLocation;
  coords: LiveCoords;
  weather: WeatherSnapshot | null;
}

interface LiveLocationValue {
  status: LiveLocationStatus;
  location: LiveLocation | null;
  weather: WeatherSnapshot | null;
  // The device position behind `location`, for features that need distances.
  coords: LiveCoords | null;
  // Rough fallback from the network (only when the provider was given `network`, and the exact position is unavailable).
  approximate: ApproximateLocation | null;
  // Asks the browser for the position — call it only from a button press.
  requestLocation: () => void;
}

const LiveLocationContext = createContext<LiveLocationValue | null>(null);

// Real GPS location -> real place name (BigDataCloud's free, keyless,
// client-safe reverse-geocode endpoint — built for exactly this use case,
// no API key or CORS proxy needed) -> real weather for those exact
// coordinates via the app's existing Open-Meteo service. Falls back
// silently (status stays "denied"/"unavailable"/"error") so callers can
// keep showing their own default rather than an error state — this is a
// nice-to-have enhancement, not something that should ever block the page.
//
// Wrapped around a page's own JSX, not the root layout, so pages that don't
// show weather never touch location, and shared via context — several
// homepage cards (hero, weather, discovery) need the same data, and without
// this each would run geolocation + reverse-geocode + a weather fetch.
//
// Finding the position:
//  - If the visitor already allowed this site, the position is read silently on every load (no prompt appears).
//  - If the browser has not been asked yet, the page asks once per visit (the browser's own Allow / Block question),
//    so the visitor lands on their own place without pressing anything. If they ignore the question, the page falls
//    back to the "Use my location" button on later pages of the same visit, so it never nags.
//  - If they blocked it, or the device cannot say, a page that passes `network` also gets an approximate position
//    from the network (see /api/geo), clearly labelled, with the city list still one click away.
const ASKED_KEY = "livecity:locationAsked";

export function LiveLocationProvider({ children, network = false }: { children: ReactNode; network?: boolean }) {
  const [status, setStatus] = useState<LiveLocationStatus>("idle");
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [coords, setCoords] = useState<LiveCoords | null>(null);
  const [approximate, setApproximate] = useState<ApproximateLocation | null>(null);

  // Rough city from the network address, read on our own server (nothing goes to another company, nothing is stored).
  const locateByNetwork = useCallback(async () => {
    if (!network) return;
    try {
      const res = await fetch("/api/geo", { cache: "no-store" });
      if (!res.ok) return;
      const g = (await res.json()) as { available?: boolean; city?: string; country?: string | null; lat?: number; lon?: number };
      if (!g.available || !g.city || typeof g.lat !== "number" || typeof g.lon !== "number") return;
      const w = await fetch(`/api/weather/live?lat=${g.lat}&lon=${g.lon}`)
        .then((r) => (r.ok ? (r.json() as Promise<WeatherSnapshot>) : null))
        .catch(() => null);
      setApproximate({ location: { name: g.city, area: null, countryName: g.country ?? null }, coords: { lat: g.lat, lon: g.lon, accuracyKm: 25 }, weather: w });
    } catch {
      /* no approximate position: the page keeps offering the city list */
    }
  }, [network]);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      void locateByNetwork();
      return;
    }

    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        const [geoResult, weatherResult] = await Promise.allSettled([
          fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          ).then((r) => (r.ok ? (r.json() as Promise<ReverseGeocodeResponse>) : null)),
          // Rounded to about 1 km (plenty for a forecast; the server does the same), so the answer can be shared and cached.
          fetch(`/api/weather/live?lat=${latitude.toFixed(2)}&lon=${longitude.toFixed(2)}`).then((r) =>
            r.ok ? (r.json() as Promise<WeatherSnapshot>) : null,
          ),
        ]);

        const geo = geoResult.status === "fulfilled" ? geoResult.value : null;
        const weatherData = weatherResult.status === "fulfilled" ? weatherResult.value : null;

        const name = geo?.city || geo?.locality || geo?.principalSubdivision || null;
        // BigDataCloud's `locality` is the most granular real place name it
        // returns (neighborhood/ward/district level) — surfaced separately
        // from `name` (the broader city) only when it's genuinely more
        // specific, so callers can show "Tsuruhashi, Osaka" instead of just
        // "Osaka" when the data supports it, without ever duplicating text.
        const area = geo?.locality && geo.locality !== name ? geo.locality : null;

        setCoords({ lat: latitude, lon: longitude, accuracyKm: Math.round((accuracy / 1000) * 10) / 10 });
        if (name) {
          setLocation({ name, area, countryName: geo?.countryName ?? null });
          rememberCity(name);
        }
        if (weatherData) setWeather(weatherData);
        setStatus(name || weatherData ? "ready" : "error");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        void locateByNetwork();
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }, [locateByNetwork]);

  // navigator.geolocation / navigator.permissions are browser-only (unavailable
  // during SSR), so this can only run post-mount.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unavailable");
      void locateByNetwork();
      return;
    }
    // Ask by itself only once per visit (per tab), so moving between pages never nags.
    const askOnce = () => {
      let asked = false;
      try {
        asked = window.sessionStorage.getItem(ASKED_KEY) === "1";
        window.sessionStorage.setItem(ASKED_KEY, "1");
      } catch {
        /* private mode: ask each time, which the browser itself limits */
      }
      if (asked) {
        setStatus("prompt");
        void locateByNetwork();
      } else {
        locate();
      }
    };
    let cancelled = false;
    const query = navigator.permissions?.query?.({ name: "geolocation" as PermissionName });
    if (!query) {
      askOnce();
      return;
    }
    query
      .then((result) => {
        if (cancelled) return;
        if (result.state === "granted") locate();
        else if (result.state === "denied") {
          setStatus("denied");
          void locateByNetwork();
        } else askOnce();
      })
      .catch(() => {
        if (!cancelled) askOnce();
      });
    return () => {
      cancelled = true;
    };
  }, [locate, locateByNetwork]);

  return (
    <LiveLocationContext.Provider value={{ status, location, weather, coords, approximate, requestLocation: locate }}>
      {children}
    </LiveLocationContext.Provider>
  );
}

export function useLiveLocationContext(): LiveLocationValue {
  const ctx = useContext(LiveLocationContext);
  if (!ctx) {
    throw new Error("useLiveLocation must be used within a LiveLocationProvider");
  }
  return ctx;
}
