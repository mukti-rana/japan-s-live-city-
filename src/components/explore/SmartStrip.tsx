"use client";

import { useState } from "react";
import Link from "next/link";
import { Dices, Heart, ListChecks, RefreshCw } from "lucide-react";
import PlaceTile from "@/components/discovery/PlaceTile";
import { buildParams, scopeFor, type ExploreFilters } from "@/lib/explore/filters";
import type { Destination, ExploreResult } from "@/lib/explore/types";
import type { ExploreLocation } from "@/lib/explore/useExploreLocation";
import { useTrip } from "@/lib/explore/useTrip";
import { useFavorites } from "@/lib/personalization/FavoritesContext";
import { useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Three quick tools: a surprise pick from what the visitor is looking at,
// the trip planner, and the saved places.
export default function SmartStrip({ filters, origin, month, savedCount }: { filters: ExploreFilters; origin: ExploreLocation | null; month: number; savedCount: number }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const trip = useTrip();
  const { ready } = useFavorites();
  const [pick, setPick] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);

  // A random place among the best few matches for where and what they chose;
  // never the one just shown.
  async function surprise() {
    setLoading(true);
    setEmpty(false);
    try {
      const p = buildParams({ ...filters, q: "", sort: "recommended", bbox: null }, origin, language, 40);
      if (scopeFor(origin) === "near") p.set("radius", String(Math.max(filters.radius, 25)));
      const r = await fetch(`/api/explore?${p.toString()}`);
      if (!r.ok) throw new Error("failed");
      const d = (await r.json()) as ExploreResult;
      const pool = d.items.filter((i) => i.id !== pick?.id && (i.image || i.abouts.en || i.abouts.ja));
      if (pool.length === 0) setEmpty(true);
      else setPick(pool[Math.floor(Math.random() * pool.length)]);
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  }

  const btn = "flex min-h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

  return (
    <section aria-label={tr("Quick tools")} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={() => void surprise()} disabled={loading} className={`${btn} border-neon-purple/50 bg-gradient-to-r from-azure/20 to-neon-purple/25 text-foreground hover:from-azure/30 hover:to-neon-purple/35 disabled:opacity-60`}>
          <Dices size={16} aria-hidden="true" />
          {loading ? tr("Finding a surprise…") : tr("Surprise me")}
        </button>
        <Link href="/explore/trip" className={`${btn} border-glass-border bg-glass-bg text-foreground/90 hover:border-azure/40`}>
          <ListChecks size={16} aria-hidden="true" />
          {tr("Trip planner")}
          {trip.ids.length > 0 && <span className="rounded-full bg-neon-purple px-1.5 text-[10px] font-bold text-white">{trip.ids.length}</span>}
        </Link>
        <a href="#saved" className={`${btn} border-glass-border bg-glass-bg text-foreground/90 hover:border-azure/40`}>
          <Heart size={16} aria-hidden="true" />
          {tr("Saved places")}
          {ready && savedCount > 0 && <span className="rounded-full bg-sakura px-1.5 text-[10px] font-bold text-white">{savedCount}</span>}
        </a>
      </div>
      {empty && <p role="status" className="text-xs text-muted">{tr("Nothing to suggest with these choices — try a wider area or fewer categories.")}</p>}
      {pick && (
        <div className="grid max-w-md gap-3 sm:grid-cols-[14rem_1fr] sm:items-end">
          <PlaceTile place={pick} approximate={origin?.mode === "manual"} month={month} />
          <div className="flex flex-col gap-2 text-xs text-muted">
            <p>{origin ? tr("Picked from the best matches near {place}, using the categories you chose.").replace("{place}", origin.label) : tr("Picked from the best matches across Japan, using the categories you chose.")}</p>
            <button type="button" onClick={() => void surprise()} disabled={loading} className="flex w-fit items-center gap-1.5 rounded-full border border-glass-border px-3 py-1.5 font-medium text-foreground/85 hover:border-azure/40 disabled:opacity-60">
              <RefreshCw size={12} aria-hidden="true" />
              {tr("Another one")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
