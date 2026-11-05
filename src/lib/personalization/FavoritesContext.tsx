"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/supabase/AuthContext";
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

// Saved on this device for guests (and whenever accounts aren't configured);
// in the user's own database rows when signed in, so they follow them across
// devices. Anything a guest saved is moved into the account on sign-in.
function readLocal(): Record<FavoriteKind, string[]> {
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
  return next;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const [items, setItems] = useState<Record<FavoriteKind, string[]>>(EMPTY);
  const [ready, setReady] = useState(false);
  const userId = user?.id ?? null;
  const local = !configured || !userId;

  useEffect(() => {
    if (loading) return;

    if (local) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(readLocal());
      setReady(true);
      return;
    }

    let active = true;
    const db = createClient();
    db.from("favorites")
      .select("kind,key")
      .then(async ({ data, error }) => {
        if (!active) return;
        const next: Record<FavoriteKind, string[]> = { city: [], place: [], line: [] };
        if (!error) {
          for (const row of (data ?? []) as { kind: string; key: string }[]) {
            if ((KINDS as string[]).includes(row.kind)) next[row.kind as FavoriteKind].push(row.key);
          }
          // Move what this browser saved as a guest into the account.
          const guest = readLocal();
          const rows = KINDS.flatMap((kind) => guest[kind].filter((key) => !next[kind].includes(key)).map((key) => ({ kind, key })));
          if (rows.length > 0) {
            const { error: insertError } = await db.from("favorites").insert(rows);
            if (!insertError) {
              for (const r of rows) next[r.kind].push(r.key);
              for (const kind of KINDS) {
                try {
                  window.localStorage.removeItem(LOCAL_KEYS[kind]);
                } catch {
                  /* ignore */
                }
              }
            }
          }
        }
        if (!active) return;
        setItems(next);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [loading, local, userId]);

  const isFavorite = useCallback((kind: FavoriteKind, key: string) => items[kind].includes(key), [items]);

  const toggle = useCallback(
    (kind: FavoriteKind, key: string) => {
      if (loading) return;

      const previous = items[kind];
      const has = previous.includes(key);
      const next = has ? previous.filter((k) => k !== key) : [...previous, key];
      setItems((prev) => ({ ...prev, [kind]: next }));

      if (local) {
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
    [items, loading, local],
  );

  return (
    <FavoritesContext.Provider value={{ items, ready, isFavorite, toggle }}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesValue {
  return useContext(FavoritesContext);
}
