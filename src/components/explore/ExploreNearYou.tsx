"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { findPlaceCity, type PlaceCity } from "@/lib/data/places";
import { PLACE_CATEGORY_META } from "@/lib/data/placeCategories";
import type { EnrichedPlace } from "@/lib/services/places";

const PICKABLE_CITIES: PlaceCity[] = [
  "Tokyo",
  "Kyoto",
  "Osaka",
  "Nara",
  "Hiroshima",
  "Hokkaido",
  "Gifu",
  "Kanazawa",
  "Okinawa",
];

// Only offers manual picks from the 9 cities this project actually has
// curated places for — never the fuller hero-city list, which would let
// someone pick a city (e.g. Kobe, Fukuoka) that always returns zero
// results here.
export default function ExploreNearYou({ places }: { places: EnrichedPlace[] }) {
  const { status, location } = useLiveLocation();
  const [manualCity, setManualCity] = useState<PlaceCity | null>(null);

  const isLoadingLocation = status === "idle" || status === "locating";
  const liveCity = status === "ready" && location?.name ? findPlaceCity(location.name) : undefined;
  const city = liveCity ?? manualCity ?? undefined;
  const needsPicker = !isLoadingLocation && !city;

  const matches = useMemo(() => {
    if (!city) return [];
    return places.filter((p) => p.city === city).slice(0, 4);
  }, [places, city]);

  return (
    <GlassCard className="p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <MapPin size={17} />
        </div>
        <p className="text-sm font-semibold text-foreground">
          📍 <T k="explore.nearYou" />
        </p>
      </div>

      {isLoadingLocation && <div className="h-16 animate-pulse rounded-lg bg-glass-bg-strong" />}

      {needsPicker && (
        <div>
          <p className="text-xs text-muted">
            <T k="hero.chooseCity" />
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PICKABLE_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setManualCity(c)}
                className="rounded-full border border-glass-border bg-glass-bg px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-gold/40 hover:text-foreground"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {city && (
        <>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs text-muted">
            <span className="font-medium text-foreground/80">{city}</span>
            {manualCity && (
              <button
                type="button"
                onClick={() => setManualCity(null)}
                className="text-azure hover:underline"
              >
                <T k="hero.changeCity" />
              </button>
            )}
          </p>

          {matches.length === 0 ? (
            <p className="text-xs text-muted">
              <T k="explore.nearYouEmpty" />
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {matches.map((place) => {
                const Icon = PLACE_CATEGORY_META[place.category].icon;
                return (
                  <li key={place.name}>
                    <a
                      href={place.wikipediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2"
                    >
                      <Icon size={13} className="shrink-0 text-muted" />
                      <span className="truncate text-xs font-medium text-foreground group-hover:text-azure">
                        {place.name}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </GlassCard>
  );
}
