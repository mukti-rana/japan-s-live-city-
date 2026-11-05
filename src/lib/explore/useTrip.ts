"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// A trip list kept on this device, so guests can plan without an account. It
// holds only destination ids, in the order they were added.
const KEY = "livecity:trip";
const EVENT = "livecity:tripchange";
const MAX = 20;

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function snapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

export const TRIP_LIMIT = MAX;

export function useTrip() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const ids = useMemo<string[]>(() => {
    try {
      const v: unknown = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }, [raw]);

  const toggle = useCallback((id: string) => {
    const current = JSON.parse(snapshot()) as string[];
    write(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }, []);
  const remove = useCallback((id: string) => write((JSON.parse(snapshot()) as string[]).filter((x) => x !== id)), []);
  const clear = useCallback(() => write([]), []);
  return { ids, has: (id: string) => ids.includes(id), toggle, remove, clear, full: ids.length >= MAX };
}
