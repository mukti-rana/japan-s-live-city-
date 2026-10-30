"use client";

import { useCallback, useSyncExternalStore } from "react";

// Which place the Home weather card shows: "auto" (the visitor's own
// location, falling back to Tokyo) or a prefecture id the visitor picked.
// Only that id is remembered — never coordinates.

const KEY = "livecity:weatherCity";
const EVENT = "livecity:weathercity";

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
    return window.localStorage.getItem(KEY) ?? "auto";
  } catch {
    return "auto";
  }
}

export function useWeatherCity(): [string, (id: string) => void] {
  const selected = useSyncExternalStore(subscribe, getSnapshot, () => "auto");
  const choose = useCallback((id: string) => {
    try {
      if (id === "auto") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, id);
    } catch {
      // Storage unavailable — the choice just won't be remembered.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [selected, choose];
}
