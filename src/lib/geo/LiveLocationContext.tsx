"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { WeatherSnapshot } from "@/lib/services/weather";
import { rememberCity } from "@/lib/geo/sessionCity";

export interface LiveLocation {
  name: string;
  area: string | null;
  countryName: string | null;
}

// "prompt" = the browser has not been asked yet. The page never asks by
// itself: it waits for the visitor to press a "Use my location" button.
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

interface LiveLocationValue {
  status: LiveLocationStatus;
  location: LiveLocation | null;
  weather: WeatherSnapshot | null;
  // The device position behind `location`, for features that need distances.
  coords: LiveCoords | null;
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
// The browser's permission prompt is shown only when the visitor asks for it
// (requestLocation). If they already allowed this site earlier, the position
// is read silently on load, because no prompt appears in that case.
export function LiveLocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LiveLocationStatus>("idle");
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [coords, setCoords] = useState<LiveCoords | null>(null);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
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
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  // navigator.geolocation / navigator.permissions are browser-only (unavailable
  // during SSR), so this can only run post-mount.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unavailable");
      return;
    }
    let cancelled = false;
    const query = navigator.permissions?.query?.({ name: "geolocation" as PermissionName });
    if (!query) {
      setStatus("prompt");
      return;
    }
    query
      .then((result) => {
        if (cancelled) return;
        if (result.state === "granted") locate();
        else setStatus(result.state === "denied" ? "denied" : "prompt");
      })
      .catch(() => {
        if (!cancelled) setStatus("prompt");
      });
    return () => {
      cancelled = true;
    };
  }, [locate]);

  return (
    <LiveLocationContext.Provider value={{ status, location, weather, coords, requestLocation: locate }}>
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
