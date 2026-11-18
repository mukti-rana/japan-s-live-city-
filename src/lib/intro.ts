"use client";

import { useSyncExternalStore } from "react";

// When the cinematic welcome plays: every time the site is opened, before the main site shows.
//  - the first time in a browser session (a new tab or a new visit): the full intro;
//  - every later load of the home page in that same session (a reload, say): the short one;
//  - never again while moving around the site without reloading it (that is one visit).
// It holds no personal data, only that this session has seen the full intro. Add ?intro=full to the home page's address to
// force the full version whenever you like.
const PLAYED = "livecity:introPlayed"; // sessionStorage: the full intro has already played in this session
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

function freshMode(): IntroMode {
  if (forcedFull()) return "full";
  try {
    return window.sessionStorage.getItem(PLAYED) === "1" ? "short" : "full";
  } catch {
    return "short"; // storage unavailable: the lighter one
  }
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
  if (mode === "full") {
    try {
      window.sessionStorage.setItem(PLAYED, "1");
    } catch {
      // Storage unavailable — later loads just show the full one again.
    }
  }
  window.dispatchEvent(new Event(EVENT));
}

export function finishIntro() {
  current = "done";
  window.dispatchEvent(new Event(EVENT));
}
