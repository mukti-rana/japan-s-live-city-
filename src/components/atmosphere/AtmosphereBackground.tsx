"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Scene from "@/components/atmosphere/Scene";
import { useAtmospherePrefs } from "@/lib/atmosphere/AtmosphereContext";
import { resolveAtmosphere, routeKind, type WeatherKind } from "@/lib/atmosphere/resolve";
import { PREFECTURE_CENTER } from "@/lib/events/geo";
import { useSessionCity } from "@/lib/geo/sessionCity";
import { resolvePlace } from "@/lib/news/places";
import type { WeatherSnapshot } from "@/lib/services/weather";
import { isNightNow } from "@/lib/weather/time";
import { useWeatherCity } from "@/lib/weather/useWeatherCity";

const REFRESH_MS = 10 * 60 * 1000;
const TOKYO: [number, number] = [35.68, 139.69];

// One shared reading per place for the whole session, refreshed at most every
// ten minutes — the same endpoint (and server cache) the weather card uses.
const CACHE = new Map<string, { at: number; weather: { icon: WeatherKind; isNight: boolean } | null }>();

function jstNow(): { month: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", month: "numeric", hour: "numeric", hour12: false }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { month: get("month"), hour: get("hour") % 24 };
}

// The real weather of the city the visitor chose for the weather card, else
// the city their browser located them in this session, else Tokyo (the same
// labelled fallback the weather card uses). Only fetched when it is needed.
function useAtmosphereWeather(enabled: boolean): { icon: WeatherKind; isNight: boolean } | null {
  const [selected] = useWeatherCity();
  const sessionCity = useSessionCity();
  const coords = useMemo<[number, number]>(() => {
    if (selected !== "auto" && PREFECTURE_CENTER[selected]) return PREFECTURE_CENTER[selected];
    const pref = resolvePlace(sessionCity)?.prefectureId;
    return (pref && PREFECTURE_CENTER[pref]) || TOKYO;
  }, [selected, sessionCity]);
  const key = `${coords[0].toFixed(2)},${coords[1].toFixed(2)}`;
  const [state, setState] = useState<{ key: string; weather: { icon: WeatherKind; isNight: boolean } | null } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      const hit = CACHE.get(key);
      if (hit && Date.now() - hit.at < REFRESH_MS) {
        setState({ key, weather: hit.weather });
        return;
      }
      fetch(`/api/weather/live?lat=${key.split(",")[0]}&lon=${key.split(",")[1]}`)
        .then((r) => (r.ok ? (r.json() as Promise<WeatherSnapshot>) : Promise.reject(new Error("failed"))))
        .then((w) => {
          const weather = { icon: w.icon as WeatherKind, isNight: isNightNow(w.sunrise, w.sunset) };
          CACHE.set(key, { at: Date.now(), weather });
          if (!cancelled) setState({ key, weather });
        })
        // No reading → no weather effect. Never a guess.
        .catch(() => !cancelled && setState({ key, weather: null }));
    };
    load();
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, key]);

  return enabled && state && state.key === key ? state.weather : null;
}

// The full-page LIVE CITY ATMOSPHERE, behind everything and never in the way
// of clicks. It follows the page, the season, the visitor's choice and (in
// Auto) the real weather; animation stops while the tab is hidden.
export default function AtmosphereBackground() {
  const pathname = usePathname();
  const { prefs } = useAtmospherePrefs();
  // Drawn only in the browser: the choice and the clock live there, and the
  // server's page would otherwise not match.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [clock, setClock] = useState(jstNow);

  useEffect(() => {
    const id = window.setInterval(() => setClock(jstNow()), 10 * 60 * 1000);
    const onVisibility = () => {
      document.documentElement.dataset.atmPaused = String(document.visibilityState === "hidden");
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const route = routeKind(pathname);
  const wantsWeather = prefs.mode === "auto" && prefs.intensity !== "off" && (route === "home" || route === "weather" || route === "explore");
  const weather = useAtmosphereWeather(wantsWeather);
  const r = resolveAtmosphere({ prefs, pathname, month: clock.month, hour: clock.hour, weather });

  if (!mounted || !r.art) return null;
  return (
    <div aria-hidden="true" className="atm-in pointer-events-none fixed inset-0 -z-10" key={`${r.art}-${r.particle}-${r.weather}-${r.animate}`}>
      <Scene art={r.art} particle={r.particle} weather={r.weather} fireworks={r.fireworks} animate={r.animate} density={r.density} veil={r.veil} />
    </div>
  );
}
