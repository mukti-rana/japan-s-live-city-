"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_PREFS, parsePrefs, type AtmospherePrefs } from "@/lib/atmosphere/resolve";

// The visitor's atmosphere choice, remembered on this device (so guests keep
// it without an account). Signed-in visitors also have it saved to their
// account — see AtmosphereSync. It is independent of every other setting.

const KEY = "livecity:atmosphere";
const EVENT = "livecity:atmosphere";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const read = (): string => {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

interface Value {
  prefs: AtmospherePrefs;
  setPrefs: (next: AtmospherePrefs) => void;
}

const Ctx = createContext<Value>({ prefs: DEFAULT_PREFS, setPrefs: () => {} });

export function AtmosphereProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const prefs = useMemo(() => {
    try {
      return raw ? parsePrefs(JSON.parse(raw)) : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  }, [raw]);
  const setPrefs = useCallback((next: AtmospherePrefs) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — the choice lasts until reload */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const value = useMemo(() => ({ prefs, setPrefs }), [prefs, setPrefs]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAtmospherePrefs(): Value {
  return useContext(Ctx);
}
