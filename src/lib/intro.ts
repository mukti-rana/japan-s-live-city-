"use client";

import { useSyncExternalStore } from "react";

// Remembers what the cinematic welcome has already done, so it is shown in the right amount:
//  - the first time a visitor gets past the entrance (Login, Create Account or Explore as Guest): the full intro;
//  - every later visit (this browser remembers it): a short version;
//  - once per browser session at most, so moving around the site never replays it.
// It holds no personal data, only that the intro was shown. Add ?intro=full to the home page's address to see the
// full version again whenever you like (handy while testing).
const PLAYED = "livecity:introPlayed"; // sessionStorage: already shown in this tab's session
const VISITS = "livecity:introVisits"; // localStorage: how many times this browser has started it
const EVENT = "livecity:intro";

export type IntroMode = "full" | "short";

// The intro that is playing (or has just finished) in this page; it must not change underneath itself while it runs.
let current: IntroMode | "done" | null = null;

function forcedFull(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("intro") === "full";
  } catch {
    return false;
  }
}

function freshMode(): IntroMode | "none" {
  if (forcedFull()) return "full";
  try {
    if (window.sessionStorage.getItem(PLAYED) === "1") return "none";
  } catch {
    return "none"; // storage unavailable: never nag
  }
  let visits = 0;
  try {
    visits = Number(window.localStorage.getItem(VISITS) ?? 0) || 0;
  } catch {
    // Treated as a first visit.
  }
  return visits > 0 ? "short" : "full";
}

function getSnapshot(): IntroMode | "none" {
  if (current === "done") return "none";
  return current ?? freshMode();
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

// "unknown" on the server and during hydration, so the server's page never contains the intro.
export function useIntroMode(): "unknown" | IntroMode | "none" {
  return useSyncExternalStore(subscribe, getSnapshot, () => "unknown" as const);
}

export function beginIntro(mode: IntroMode) {
  if (current) return;
  current = mode;
  try {
    window.sessionStorage.setItem(PLAYED, "1");
    window.localStorage.setItem(VISITS, String((Number(window.localStorage.getItem(VISITS) ?? 0) || 0) + 1));
  } catch {
    // Storage unavailable — it just may be shown again.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function finishIntro() {
  current = "done";
  window.dispatchEvent(new Event(EVENT));
}
