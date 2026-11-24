"use client";

import { useSyncExternalStore } from "react";

// The cinematic welcome plays only the first time the site is entered in a visit (one browser tab, until it is closed): not
// again on a refresh, nor when the Home button is pressed, nor when moving around inside the site. A new visit (a new tab, or
// the browser reopened) plays it again. The "already seen" fact is kept in sessionStorage; if the browser will not store it
// (private mode), it is kept for as long as the page stays loaded. This file holds that fact for the page, and
// the few things the intro does to the page around it:
//   - while it waits or plays, the home page is kept invisible (data-intro="hold") and the top-bar logo hidden;
//   - when the logo starts to fly, the page arrives (data-intro="reveal": see cinematic.css);
//   - when the logo lands, the top-bar logo is shown and set to the same moment of its own drawing, so it matches.
const EVENT = "livecity:intro";

const SEEN_KEY = "livecity:introSeen";

let current: "playing" | "done" | null = null;

// Has the intro already been shown on this visit? Read once per page load, on the client only.
let checkedStorage = false;
function seenThisVisit(): boolean {
  if (!checkedStorage) {
    checkedStorage = true;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY) === "1") current = "done";
    } catch {
      /* storage blocked: the intro is then shown once per page load */
    }
  }
  return current === "done";
}

function getSnapshot(): "play" | "none" {
  return seenThisVisit() ? "none" : "play";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

// "unknown" on the server and during hydration, so the server's page never contains the intro.
export function useIntroMode(): "unknown" | "play" | "none" {
  return useSyncExternalStore(subscribe, getSnapshot, () => "unknown" as const);
}

export function beginIntro() {
  if (current) return;
  current = "playing";
  // Counted as seen from the moment it starts, so a refresh part-way through does not play it all again.
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function finishIntro() {
  current = "done";
  window.dispatchEvent(new Event(EVENT));
}

const root = () => document.documentElement;

// Keep the page itself out of sight while the intro is waiting or playing (it sits behind the intro anyway).
export function holdPage(on: boolean) {
  if (on) {
    root().dataset.intro = "hold";
    root().setAttribute("data-intro-fly", "");
  } else if (root().dataset.intro === "hold") {
    delete root().dataset.intro;
    root().removeAttribute("data-intro-fly");
  }
}

// The page arrives (cinematic.css animates it); the attribute is cleared once those animations are over.
let revealTimer: number | undefined;
export function revealPage() {
  root().dataset.intro = "reveal";
  window.clearTimeout(revealTimer);
  revealTimer = window.setTimeout(() => delete root().dataset.intro, 2400);
}

// The flying logo has landed (or the intro was skipped): show the top-bar logo, and start its drawing from the moment where
// the emblem is complete and its name is still to be written, so what lands is exactly what is there.
export function settleHeaderLogo() {
  root().removeAttribute("data-intro-fly");
  const link = document.querySelector('[data-site-header] a[aria-label="LIVE CITY JAPAN"]');
  if (!link || typeof link.getAnimations !== "function") return;
  for (const a of link.getAnimations({ subtree: true })) {
    const name = (a as CSSAnimation).animationName ?? "";
    if (name === "lg-line" || name === "lg-art") a.currentTime = 3300;
    else if (name.startsWith("hw-write")) a.currentTime = 0;
  }
}
