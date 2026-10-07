"use client";

import { useSyncExternalStore } from "react";

const KEY = "livecity:welcomeSeen";
const EVENT = "livecity:welcomeseen";

// Remembers (for this browser session only) that the visitor has already
// answered the Sign in / Create account / Continue as guest choice, so it
// isn't repeated on every page load — but it comes back the next time the
// link is opened, until they sign in. It holds no personal data.
export function markWelcomeSeen() {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Storage unavailable — the choice just won't be remembered.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function getSnapshot(): "seen" | "new" {
  try {
    return window.sessionStorage.getItem(KEY) === "1" ? "seen" : "new";
  } catch {
    return "seen";
  }
}

// "unknown" on the server and during hydration, so the server HTML never
// contains the welcome screen — crawlers and slow connections see the real
// home page.
export function useWelcomeState(): "unknown" | "seen" | "new" {
  return useSyncExternalStore(subscribe, getSnapshot, () => "unknown" as const);
}
