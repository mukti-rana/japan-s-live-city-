"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { LanguageCode } from "@/lib/i18n/languages";
import type { EventView, EventsResult } from "@/lib/events/query";
import { toQueryString, type NewsParams } from "@/lib/news/queryString";
import { getPrefecture } from "@/lib/news/places";

// ── Saved events (this device only) ──────────────────────────────────────
// Saved events are just a list of ids in this browser. They are not tied to an
// account, so nothing is uploaded and nothing follows the visitor elsewhere.

const KEY = "livecity:savedEvents";
const EVENT = "livecity:savedevents";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function useSavedEvents() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const ids = useMemo<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }, [raw]);

  // Reads the list as it is right now, not as it was at the last render, so
  // two quick saves (or saves from two tabs) can't overwrite each other.
  const toggle = useCallback((id: string) => {
    let current: string[] = [];
    try {
      const parsed: unknown = JSON.parse(getSnapshot());
      if (Array.isArray(parsed)) current = parsed.filter((v): v is string => typeof v === "string");
    } catch {
      current = [];
    }
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current].slice(0, 100);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable — saving just won't stick.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { ids, isSaved: (id: string) => ids.includes(id), toggle };
}

// ── Dates, in Japan time ─────────────────────────────────────────────────

const JST = "Asia/Tokyo";

function asDate(day: string): Date {
  return new Date(`${day}T00:00:00+09:00`);
}

export function formatDay(day: string, language: LanguageCode, withYear = false): string {
  return new Intl.DateTimeFormat(language, { timeZone: JST, month: "short", day: "numeric", weekday: "short", ...(withYear ? { year: "numeric" } : {}) }).format(asDate(day));
}

export function formatRange(range: { start: string; end: string }, language: LanguageCode, today: string): string {
  const withYear = range.start.slice(0, 4) !== today.slice(0, 4) || range.end.slice(0, 4) !== today.slice(0, 4);
  if (range.start === range.end) return formatDay(range.start, language, withYear);
  return `${formatDay(range.start, language, withYear)} – ${formatDay(range.end, language, withYear)}`;
}

export function formatUpdated(iso: string | null | undefined, language: LanguageCode): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(language, { timeZone: JST, dateStyle: "medium" }).format(date);
}

// "today", "tomorrow", "in 3 days" — in the reader's language.
export function startsIn(days: number, language: LanguageCode): string {
  return new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(days, "day");
}

export function prefectureName(id: string | null, language: LanguageCode): string | null {
  if (!id) return null;
  const pref = getPrefecture(id);
  return pref ? (language === "ja" ? pref.ja : pref.en) : null;
}

// ── Maps (links only — no map key or tracking script is needed) ──────────

export function mapQuery(e: Pick<EventView, "lat" | "lon" | "locationApprox" | "venue" | "address" | "city" | "prefectureId">): string | null {
  if (e.lat !== null && e.lon !== null && !e.locationApprox) return `${e.lat},${e.lon}`;
  const text = [e.venue, e.address].filter(Boolean).join(" ");
  return text || null;
}

export function mapUrl(e: Parameters<typeof mapQuery>[0]): string | null {
  const q = mapQuery(e);
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

export function directionsUrl(e: Parameters<typeof mapQuery>[0]): string | null {
  const q = mapQuery(e);
  return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null;
}

export function osmEmbed(lat: number, lon: number): string {
  const dx = 0.008;
  const dy = 0.005;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - dx},${lat - dy},${lon + dx},${lat + dy}&layer=mapnik&marker=${lat},${lon}`;
}

// ── Fetching ─────────────────────────────────────────────────────────────

interface FeedState {
  key: string;
  data?: EventsResult;
  failed?: boolean;
}

export function useEventsFeed(params: NewsParams | null) {
  const key = params ? toQueryString(params) : null;
  const [state, setState] = useState<FeedState | null>(null);

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    fetch(`/api/events?${key}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<EventsResult>) : Promise.reject(new Error("failed"))))
      .then((data) => setState({ key, data }))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setState({ key, failed: true });
      });
    return () => controller.abort();
  }, [key]);

  const current = state && state.key === key ? state : null;
  return { data: current?.data, failed: Boolean(current?.failed), loading: key !== null && !current };
}
