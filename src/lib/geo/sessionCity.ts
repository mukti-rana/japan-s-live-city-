"use client";

import { useSyncExternalStore } from "react";

const KEY = "livecity:currentCity";
const EVENT = "livecity:currentcity";

// Remembers only the *name* of the visitor's detected city, for this browser
// tab/session only (sessionStorage is cleared when the tab closes). Never
// coordinates, never anything persistent — so the top bar can say where you
// are across pages without anyone needing an account or storing location.
export function rememberCity(name: string) {
  try {
    window.sessionStorage.setItem(KEY, name);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function getSnapshot(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function useSessionCity(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
