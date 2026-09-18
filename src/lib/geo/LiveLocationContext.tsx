"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { WeatherSnapshot } from "@/lib/services/weather";

export interface LiveLocation {
  name: string;
  area: string | null;
  countryName: string | null;
}

export type LiveLocationStatus = "idle" | "locating" | "ready" | "denied" | "unavailable" | "error";

interface ReverseGeocodeResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

interface LiveLocationValue {
  status: LiveLocationStatus;
  location: LiveLocation | null;
  weather: WeatherSnapshot | null;
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
// Runs once per page (wrapped around a page's own JSX, not the root
// layout, so pages that don't show weather never prompt for location) and
// shares the result via context — several homepage cards (hero, weather
// widget, live weather card) all need the same data, and without this
// each would independently re-run geolocation + reverse-geocode + a
// weather fetch on mount.
export function LiveLocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LiveLocationStatus>("idle");
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);

  // navigator.geolocation is a browser-only capability check (unavailable
  // during SSR) — this can only run post-mount, and the subsequent
  // setState calls inside getCurrentPosition's callbacks are the
  // React-recommended "subscribe to an external system" pattern.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unavailable");
      return;
    }

    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        const [geoResult, weatherResult] = await Promise.allSettled([
          fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          ).then((r) => (r.ok ? (r.json() as Promise<ReverseGeocodeResponse>) : null)),
          fetch(`/api/weather/live?lat=${latitude}&lon=${longitude}`).then((r) =>
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

        if (name) setLocation({ name, area, countryName: geo?.countryName ?? null });
        if (weatherData) setWeather(weatherData);
        setStatus(name || weatherData ? "ready" : "error");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  return (
    <LiveLocationContext.Provider value={{ status, location, weather }}>
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
