"use client";

import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";
import PlaceImage from "@/components/explore/PlaceImage";
import FavoriteButton from "@/components/personalization/FavoriteButton";
import { reasonsFor } from "@/components/discovery/reasons";
import { directionsUrl } from "@/lib/discovery/discovery";
import { CATEGORY_BY_ID, pickLabel } from "@/lib/explore/categories";
import { formatDistance, placeName, prefectureLabel } from "@/lib/explore/display";
import type { Destination } from "@/lib/explore/types";
import { useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// A compact recommendation: photo, name, kind, distance, one reason, save and directions.
export default function PlaceTile({ place, approximate, month, showWhy = true }: { place: Destination; approximate: boolean; month: number; showWhy?: boolean }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const name = placeName(place, language);
  const category = CATEGORY_BY_ID.get(place.category);
  const why = showWhy ? reasonsFor(place, tr, language, month, 1)[0] : undefined;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-glass-border bg-glass-bg transition-colors hover:border-azure/35">
      <div className="relative">
        <Link href={`/explore/${place.id}`} aria-label={`${tr("View details")}: ${name}`} className="block aspect-[16/10] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <PlaceImage image={place.image} category={place.category} alt={place.image ? name : ""} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
        </Link>
        <FavoriteButton kind="place" itemKey={`wd:${place.id}`} className="absolute right-2 top-2" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          {category && <span className="rounded-full bg-azure/15 px-2 py-0.5 font-medium text-azure">{pickLabel(category.label, language)}</span>}
          {place.distanceKm !== null && (
            <span className="font-medium text-foreground/80">
              {approximate ? `${tr("approx.")} ` : ""}
              {formatDistance(place.distanceKm)}
            </span>
          )}
        </div>
        <h4 className="text-sm font-semibold leading-snug text-foreground">
          <Link href={`/explore/${place.id}`} className="hover:text-azure focus-visible:outline-none focus-visible:underline">
            {name}
          </Link>
        </h4>
        <p className="flex items-center gap-1 text-[11px] text-muted">
          <MapPin size={11} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{[place.city, prefectureLabel(place.prefectureId, language)].filter(Boolean).join(", ")}</span>
        </p>
        {why && <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/70">{why}</p>}
        <a
          href={directionsUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex w-fit items-center gap-1 pt-1 text-xs font-medium text-azure hover:underline"
        >
          <Navigation size={12} aria-hidden="true" />
          {tr("Get directions")}
        </a>
      </div>
    </article>
  );
}
