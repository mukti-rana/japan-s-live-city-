"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { getPrefecture, resolvePlace } from "@/lib/news/places";
import type { NewsItem, NewsResult } from "@/lib/news/query";
import type { LanguageCode } from "@/lib/i18n/languages";

// ── The visitor's place, shared by the News tab and the Home section ──────
// Two inputs, in this order: a city the visitor picked themselves, then the
// location the browser already shared with the site. Only the city *name* is
// ever kept or sent anywhere — never coordinates.

const KEY = "livecity:newsPlace";
const EVENT = "livecity:newsplace";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function chooseNewsPlace(name: string | null) {
  try {
    if (name) window.localStorage.setItem(KEY, name);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable — the choice just won't be remembered.
  }
  window.dispatchEvent(new Event(EVENT));
}

export interface NewsPlace {
  // The city/prefecture name used for local news, or null if we don't have one yet.
  place: string | null;
  source: "selected" | "location" | null;
  // True while the browser's location is still being worked out.
  locating: boolean;
}

export function useNewsPlace(): NewsPlace {
  const { status, location } = useLiveLocation();
  const selected = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const located = status === "ready" && location?.name && resolvePlace(location.name) ? location.name : null;
  if (selected && resolvePlace(selected)) return { place: selected, source: "selected", locating: false };
  if (located) return { place: located, source: "location", locating: false };
  return { place: null, source: null, locating: status === "idle" || status === "locating" };
}

// ── Formatting ────────────────────────────────────────────────────────────

export function placeLabel(prefectureId: string, language: LanguageCode): string {
  const pref = getPrefecture(prefectureId);
  if (!pref) return prefectureId;
  return language === "ja" ? pref.ja : pref.en;
}

// "2 hours ago", in the reader's language, from the story's real timestamp.
export function timeAgo(iso: string, language: LanguageCode): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
    ["week", 604800],
  ];
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, "second");
  for (let i = steps.length - 1; i >= 0; i--) {
    const [unit, size] = steps[i];
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), "minute");
}

// Full date and time in the visitor's own time zone.
export function fullDate(iso: string, language: LanguageCode): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// ── Fetching ──────────────────────────────────────────────────────────────

import { toQueryString, type NewsParams } from "@/lib/news/queryString";

export { toQueryString };
export type { NewsParams };

// Stories arrive straight away; those whose publisher picture hasn't been
// looked up yet are flagged, and this fills the pictures in as they come back
// (a few stories per request, so the first ones appear without waiting for all).
const IMAGE_BATCH = 4;

export function useResolvedImages(items: NewsItem[]): NewsItem[] {
  const [resolved, setResolved] = useState<Record<string, string | null>>({});
  const pendingKey = items
    .filter((i) => i.imagePending && !(i.id in resolved))
    .map((i) => i.id)
    .join(",");

  useEffect(() => {
    if (!pendingKey) return;
    const ids = pendingKey.split(",");
    const controller = new AbortController();
    for (let i = 0; i < ids.length; i += IMAGE_BATCH) {
      const batch = ids.slice(i, i + IMAGE_BATCH);
      fetch(`/api/news/images?ids=${batch.join(",")}`, { signal: controller.signal })
        .then((r) => (r.ok ? (r.json() as Promise<Record<string, string | null>>) : Promise.reject(new Error("failed"))))
        .then((map) => setResolved((prev) => ({ ...prev, ...map })))
        .catch((error: unknown) => {
          if ((error as { name?: string })?.name === "AbortError") return;
          setResolved((prev) => ({ ...prev, ...Object.fromEntries(batch.map((id) => [id, null])) }));
        });
    }
    return () => controller.abort();
  }, [pendingKey]);

  return useMemo(
    () => items.map((i) => (i.id in resolved ? { ...i, imageUrl: resolved[i.id] ?? i.imageUrl, imagePending: false } : i)),
    [items, resolved],
  );
}

interface FeedState {
  key: string;
  data?: NewsResult;
  failed?: boolean;
}

// Loads one page of stories from the shared /api/news endpoint. Pass null to
// wait (e.g. until a place is known).
export function useNewsFeed(params: NewsParams | null) {
  const key = params ? toQueryString(params) : null;
  const [state, setState] = useState<FeedState | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    fetch(`/api/news?${key}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<NewsResult>) : Promise.reject(new Error("failed"))))
      .then((data) => setState({ key, data }))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setState({ key, failed: true });
      });
    return () => controller.abort();
  }, [key, attempt]);

  const current = state && state.key === key ? state : null;
  const rawItems = current?.data?.items;
  const items = useResolvedImages(useMemo(() => rawItems ?? [], [rawItems]));
  const data = current?.data ? { ...current.data, items } : undefined;
  return {
    data,
    failed: Boolean(current?.failed),
    loading: key !== null && !current,
    retry: useCallback(() => {
      setState(null);
      setAttempt((n) => n + 1);
    }, []),
  };
}
