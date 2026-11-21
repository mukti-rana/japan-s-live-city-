"use client";

import { useEffect, useMemo, useState } from "react";
import ListingCard from "@/components/community/listings/ListingCard";
import PlacesMap from "@/components/community/PlacesMapLoader";
import Tx from "@/components/i18n/Tx";
import type { Listing } from "@/lib/community/listings/types";

// The map view: every listing in the current filters that has a map location, on the same dark map the rest of the community uses. Choosing a pin
// shows that listing's card beside the map. Only the listings' own (public) venue coordinates are used; the visitor's position is never needed.
export default function ListingsMapView({ query, now }: { query: string; now: number }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; items: Listing[] }>({ status: "loading", items: [] });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const ctl = new AbortController();
    const sep = query ? `${query}&` : "?";
    fetch(`/api/community/listings${sep}map=1&size=50`, { signal: ctl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: Listing[] }>) : Promise.reject(new Error("failed"))))
      .then((d) => setState({ status: "ready", items: d.items }))
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name !== "AbortError") setState({ status: "error", items: [] });
      });
    return () => ctl.abort();
  }, [query]);

  const points = useMemo(() => state.items.flatMap((l) => (l.lat !== null && l.lon !== null ? [{ ref: l.id, lat: l.lat, lon: l.lon }] : [])), [state.items]);
  const chosen = state.items.find((l) => l.id === selected) ?? null;

  if (state.status === "loading") return <div className="flex h-[26rem] items-center justify-center rounded-2xl border border-white/10 text-sm text-white/60" role="status"><Tx en="Loading map…" /></div>;
  if (state.status === "error") return <p role="alert" className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-sm text-white/70"><Tx en="The map couldn't be loaded right now." /></p>;
  if (points.length === 0) return <p className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-sm text-white/70"><Tx en="None of these have a map location yet." /></p>;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <PlacesMap items={points} me={null} selected={selected} onSelect={setSelected} fitKey={points.map((p) => p.ref).join(",")} />
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-white/60">
          {points.length} <Tx en="on the map" />
        </p>
        {chosen ? (
          <div className="min-h-[22rem]">
            <ListingCard l={chosen} now={now} />
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-white/65"><Tx en="Choose a pin to see it here." /></p>
        )}
      </div>
    </div>
  );
}
