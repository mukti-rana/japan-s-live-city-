"use client";

import { useEffect, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import ListingRail from "@/components/community/listings/ListingRail";
import Tx from "@/components/i18n/Tx";
import { MAP_CITIES } from "@/lib/map/cities";
import { useExploreLocation } from "@/lib/explore/useExploreLocation";
import type { Listing } from "@/lib/community/listings/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { localize } from "@/lib/i18n/inline";

// "Near you": what is happening in the visitor's prefecture. Location is never asked for: it is used only if the visitor already chose a city, or taps
// "Use my location" themselves; otherwise a few cities are offered to pick from. The city name stays in this browser, as on the Explore page.
export default function NearYouListings({ now }: { now: number }) {
  const { language } = useLanguage();
  const loc = useExploreLocation();
  const origin = loc.gps ?? loc.manual;
  const area = origin?.prefectureId ?? "";
  const [found, setFound] = useState<{ area: string; items: Listing[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (!area) return;
    const ctl = new AbortController();
    fetch(`/api/community/listings?area=${encodeURIComponent(area)}&size=8`, { signal: ctl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: Listing[] }>) : Promise.reject(new Error("failed"))))
      .then((d) => setFound({ area, items: d.items, failed: false }))
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name !== "AbortError") setFound({ area, items: [], failed: true });
      });
    return () => ctl.abort();
  }, [area]);

  const mine = found && found.area === area ? found : null;
  if (origin && mine && mine.items.length) return <ListingRail id="near-h" title={`Near you · ${origin.label}`} items={mine.items} now={now} href={`/community/events?area=${area}`} moreLabel="See all near you" />;

  return (
    <section aria-labelledby="near-h" className="flex flex-col gap-3 rounded-[26px] border border-white/10 p-5">
      <h2 id="near-h" className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <MapPin size={16} aria-hidden="true" />
        <Tx en="Near you" />
        {origin ? <span className="font-normal text-white/60">· {origin.label}</span> : null}
      </h2>
      {origin && mine ? (
        <p className="text-sm text-white/65">{mine.failed ? <Tx en="This couldn't be loaded right now." /> : <Tx en="Nothing is listed near you yet." />}</p>
      ) : origin ? (
        <p className="text-sm text-white/65" role="status"><Tx en="Looking…" /></p>
      ) : (
        <>
          <p className="text-sm text-white/65"><Tx en="Choose a city to see what is happening near you. Nothing is asked of your device." /></p>
          <div className="flex flex-wrap items-center gap-2">
            {MAP_CITIES.slice(0, 6).map((c) => (
              <button key={c.slug} type="button" onClick={() => loc.choosePlace("city", c.slug)} className="rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/55 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                {localize(c.name, c.nameJa, language)}
              </button>
            ))}
            <button type="button" onClick={loc.useMyLocation} className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-medium text-white/85 transition-colors hover:border-white/55 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              <LocateFixed size={13} aria-hidden="true" />
              <Tx en="Use my location" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
