"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "livecity:followedLines";

// Saved per-device via localStorage rather than the Supabase account
// system — accounts aren't configured in this environment (no
// NEXT_PUBLIC_SUPABASE_URL/ANON_KEY set), so a database-backed feature
// would be unusable right now. This hook's shape (a plain string[] of
// followed line names) is intentionally simple so it can be swapped for a
// real per-user Supabase table later without changing any calling code.
export function useSavedLines() {
  const [followed, setFollowed] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setFollowed(JSON.parse(raw));
    } catch {
      // Private browsing / storage disabled — fall back to session-only.
    }
    setHydrated(true);
  }, []);

  function persist(next: string[]) {
    setFollowed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore — the in-memory state still updates for this session.
    }
  }

  function isFollowed(lineName: string): boolean {
    return followed.includes(lineName);
  }

  function toggle(lineName: string) {
    persist(isFollowed(lineName) ? followed.filter((n) => n !== lineName) : [...followed, lineName]);
  }

  return { followed, hydrated, isFollowed, toggle };
}
