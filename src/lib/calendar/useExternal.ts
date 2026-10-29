"use client";

import { useEffect, useMemo, useState } from "react";
import { PREFECTURE_CENTER } from "@/lib/events/geo";
import type { EventView, EventsResult } from "@/lib/events/query";
import type { ForecastDay, WeatherSnapshot } from "@/lib/services/weather";

// Background data the calendar can show alongside the visitor's own entries.
// Each loads separately and fails separately; the calendar never waits on them.

interface Holiday {
  date: string;
  name: string;
  nameEn: string | null;
}

interface Loaded<T> {
  key: string;
  data?: T;
  failed?: boolean;
}

function useFetch<T>(url: string | null) {
  const [state, setState] = useState<Loaded<T> | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error("failed"))))
      .then((data) => setState({ key: url, data }))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setState({ key: url, failed: true });
      });
    return () => controller.abort();
  }, [url]);
  const current = state && state.key === url ? state : null;
  return { data: current?.data, failed: Boolean(current?.failed), loading: url !== null && !current };
}

export function useHolidays(enabled = true) {
  const r = useFetch<{ holidays: Holiday[]; unavailable?: boolean }>(enabled ? "/api/calendar/holidays" : null);
  const map = useMemo(() => new Map((r.data?.holidays ?? []).map((h) => [h.date, h])), [r.data]);
  return { map, failed: r.failed || Boolean(r.data?.unavailable), loading: r.loading };
}

// A 7-day forecast for a prefecture's main city (Open-Meteo, the same source
// as the Weather page). Only a prefecture name is involved — no position.
export function useForecast(prefectureId: string | null) {
  const center = prefectureId ? PREFECTURE_CENTER[prefectureId] : null;
  const r = useFetch<WeatherSnapshot>(center ? `/api/weather/live?lat=${center[0]}&lon=${center[1]}` : null);
  const byDate = useMemo(() => new Map<string, ForecastDay>((r.data?.forecast ?? []).map((d) => [d.date, d])), [r.data]);
  return { byDate, snapshot: r.data, failed: r.failed, loading: r.loading };
}

export function useLayerEvents(from: string, to: string, place: string | null, enabled: boolean) {
  const url = enabled && place ? `/api/events?from=${from}&to=${to}&near=${encodeURIComponent(place)}&limit=100` : null;
  const r = useFetch<EventsResult>(url);
  return { events: (r.data?.items ?? []) as EventView[], failed: r.failed, loading: r.loading };
}

export function useEventsToday(place: string | null, today: string) {
  const url = place ? `/api/events?from=${today}&to=${today}&near=${encodeURIComponent(place)}&limit=3` : null;
  const r = useFetch<EventsResult>(url);
  return { events: (r.data?.items ?? []) as EventView[], failed: r.failed, loading: r.loading };
}
