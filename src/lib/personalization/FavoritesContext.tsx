"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { createClient } from "@/lib/supabase/client";

export type FavoriteKind = "city" | "place" | "line";

const KINDS: FavoriteKind[] = ["city", "place", "line"];
const EMPTY: Record<FavoriteKind, string[]> = { city: [], place: [], line: [] };

// Only used when accounts aren't configured at all (e.g. local development
// without Supabase keys). The "line" key is the one the earlier My Lines
// feature already used, so nothing saved before this change is lost.
const LOCAL_KEYS: Record<FavoriteKind, string> = {
  city: "livecity:favorites:city",
  place: "livecity:favorites:place",
  line: "livecity:followedLines",
};

interface FavoritesValue {
  items: Record<FavoriteKind, string[]>;
  ready: boolean;
  isFavorite: (kind: FavoriteKind, key: string) => boolean;
  toggle: (kind: FavoriteKind, key: string) => void;
}

const FavoritesContext = createContext<FavoritesValue>({
  items: EMPTY,
  ready: false,
  isFavorite: () => false,
  toggle: () => {},
});

// Three modes, decided by the account setup:
//  - Signed in: favorites live in the user's own database rows (protected
//    by row-level security) and follow them across devices.
//  - Guest, accounts available: nothing is stored; saving gently offers a
//    free account instead ("Explore first. Personalize later.").
//  - Accounts not configured: saved on this device only, so local
//    development keeps working.
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const [items, setItems] = useState<Record<FavoriteKind, string[]>>(EMPTY);
  const [ready, setReady] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (loading) return;

    if (!configured) {
      const next: Record<FavoriteKind, string[]> = { city: [], place: [], line: [] };
      for (const kind of KINDS) {
        try {
          const raw = window.localStorage.getItem(LOCAL_KEYS[kind]);
          const parsed: unknown = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) next[kind] = parsed.filter((v): v is string => typeof v === "string");
        } catch {
          // Storage unavailable — start empty for this session.
        }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(next);
      setReady(true);
      return;
    }

    if (!userId) {
      setItems(EMPTY);
      setReady(true);
      return;
    }

    let active = true;
    createClient()
      .from("favorites")
      .select("kind,key")
      .then(({ data, error }) => {
        if (!active) return;
        const next: Record<FavoriteKind, string[]> = { city: [], place: [], line: [] };
        if (!error) {
          for (const row of (data ?? []) as { kind: string; key: string }[]) {
            if ((KINDS as string[]).includes(row.kind)) next[row.kind as FavoriteKind].push(row.key);
          }
        }
        setItems(next);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [loading, configured, userId]);

  const isFavorite = useCallback((kind: FavoriteKind, key: string) => items[kind].includes(key), [items]);

  const toggle = useCallback(
    (kind: FavoriteKind, key: string) => {
      if (loading) return;
      if (configured && !userId) {
        requestAccount();
        return;
      }

      const previous = items[kind];
      const has = previous.includes(key);
      const next = has ? previous.filter((k) => k !== key) : [...previous, key];
      setItems((prev) => ({ ...prev, [kind]: next }));

      if (!configured) {
        try {
          window.localStorage.setItem(LOCAL_KEYS[kind], JSON.stringify(next));
        } catch {
          // Ignore — the in-memory state still updated for this session.
        }
        return;
      }

      const table = createClient().from("favorites");
      const request = has ? table.delete().eq("kind", kind).eq("key", key) : table.insert({ kind, key });
      request.then(({ error }) => {
        // Roll back the optimistic change if the database refused it (for
        // example the setup SQL hasn't been run yet).
        if (error) setItems((prev) => ({ ...prev, [kind]: previous }));
      });
    },
    [items, loading, configured, userId, requestAccount],
  );

  return (
    <FavoritesContext.Provider value={{ items, ready, isFavorite, toggle }}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesValue {
  return useContext(FavoritesContext);
}
