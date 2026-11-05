"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import DestinationCard from "@/components/explore/DestinationCard";
import type { Destination } from "@/lib/explore/types";
import { useFavorites } from "@/lib/personalization/FavoritesContext";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useTranslate } from "@/lib/i18n/inline";

// The places saved with the heart: on this device for guests, and in the
// account (following the visitor across devices) once signed in.
export default function SavedPlaces({ onCount }: { onCount?: (n: number) => void }) {
  const tr = useTranslate();
  const { items, ready } = useFavorites();
  const { user, configured } = useAuth();
  const ids = items.place.filter((k) => k.startsWith("wd:")).map((k) => k.slice(3));
  const key = ids.join(",");
  const [fetched, setFetched] = useState<{ key: string; items: Destination[] } | null>(null);

  useEffect(() => {
    onCount?.(ids.length);
  });
  useEffect(() => {
    if (!key) return;
    const c = new AbortController();
    fetch(`/api/explore/places?ids=${key}`, { signal: c.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: Destination[] }>) : null))
      .then((d) => d && setFetched({ key, items: d.items }))
      .catch(() => {});
    return () => c.abort();
  }, [key]);

  const shown = fetched && fetched.key === key ? fetched.items : [];

  return (
    <section id="saved" aria-label={tr("Saved places")} className="scroll-mt-24 flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground sm:text-xl">
            <Heart size={18} className="text-sakura" aria-hidden="true" />
            {tr("Saved places")}
          </h2>
          <p className="text-xs text-muted">{configured && user ? tr("Saved to your account — they follow you across devices.") : tr("Saved on this device. Sign in to keep them across devices.")}</p>
        </div>
      </div>
      {!ready ? null : ids.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-glass-border p-5 text-center text-sm text-muted">{tr("Nothing saved yet. Tap the heart on any place to keep it here.")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {shown.map((p) => (
            <li key={p.id}>
              <DestinationCard place={p} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
