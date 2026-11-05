"use client";

import Link from "next/link";
import { ExternalLink, MapPin, Plus, Check, Sparkles, Award } from "lucide-react";
import PlaceImage from "@/components/explore/PlaceImage";
import { X } from "@/components/explore/explore-text";
import FavoriteButton from "@/components/personalization/FavoriteButton";
import { CATEGORY_BY_ID, pickLabel } from "@/lib/explore/categories";
import { formatDistance, placeAbout, placeName, placeNameJa, prefectureLabel } from "@/lib/explore/display";
import type { Destination } from "@/lib/explore/types";
import { useTrip } from "@/lib/explore/useTrip";
import { useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// One destination. The photograph is the place's own (credited); the badges
// and distance are real data; the short text is Wikipedia's introduction.
export default function DestinationCard({
  place,
  approximateDistance = false,
  compact = false,
}: {
  place: Destination;
  // True when the distance is measured from a city the visitor picked.
  approximateDistance?: boolean;
  compact?: boolean;
}) {
  const { language } = useLanguage();
  const x = useInline(X);
  const trip = useTrip();
  const name = placeName(place, language);
  const ja = placeNameJa(place, language);
  const about = placeAbout(place, language);
  const category = CATEGORY_BY_ID.get(place.category);
  const inTrip = trip.has(place.id);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-glass-border bg-glass-bg transition-colors hover:border-azure/35">
      <div className="relative">
        <Link href={`/explore/${place.id}`} aria-label={`${x("details")}: ${name}`} className="block aspect-[16/10] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <PlaceImage image={place.image} category={place.category} alt={place.image ? name : ""} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
        </Link>
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {place.worldHeritage && (
            <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-gold backdrop-blur-sm">
              <Award size={10} aria-hidden="true" />
              {x("heritageBadge")}
            </span>
          )}
          {place.hiddenGem && (
            <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-[#c4b5fd] backdrop-blur-sm">
              <Sparkles size={10} aria-hidden="true" />
              {x("hiddenBadge")}
            </span>
          )}
        </div>
        <FavoriteButton kind="place" itemKey={`wd:${place.id}`} className="absolute right-2 top-2" />
        {place.image && (
          <a
            href={place.image.page}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-1.5 right-2 max-w-[70%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[9px] text-white/80 hover:text-white"
            title={`${x("photoBy")}: ${[place.image.author, place.image.license].filter(Boolean).join(" · ") || "Wikimedia Commons"}`}
          >
            {x("photoBy")}: {place.image.author ?? "Wikimedia Commons"}
            {place.image.license ? ` · ${place.image.license}` : ""}
          </a>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          <span className="rounded-full bg-azure/15 px-2 py-0.5 font-medium text-azure">{category ? pickLabel(category.label, language) : ""}</span>
          <span className="flex items-center gap-1">
            <MapPin size={11} aria-hidden="true" />
            {[place.city, prefectureLabel(place.prefectureId, language)].filter(Boolean).join(", ")}
          </span>
          {place.distanceKm !== null && (
            <span className="font-medium text-foreground/80">
              {approximateDistance ? `${x("approx")} ` : ""}
              {formatDistance(place.distanceKm)}
            </span>
          )}
        </div>

        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link href={`/explore/${place.id}`} className="hover:text-azure focus-visible:outline-none focus-visible:underline">
            {name}
          </Link>
          {ja && <span className="ml-2 font-jp text-xs font-normal text-muted">{ja}</span>}
        </h3>

        {!compact && about && <p className={`line-clamp-3 text-xs leading-relaxed text-foreground/70 ${about.language === "ja" ? "font-jp" : ""}`}>{about.text}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Link href={`/explore/${place.id}`} className="rounded-full bg-azure/15 px-3 py-1.5 text-xs font-semibold text-azure transition-colors hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {x("details")}
          </Link>
          <button
            type="button"
            onClick={() => trip.toggle(place.id)}
            disabled={!inTrip && trip.full}
            aria-pressed={inTrip}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-50 ${
              inTrip ? "border-neon-purple/50 bg-neon-purple/15 text-[#c4b5fd]" : "border-glass-border text-foreground/80 hover:border-azure/40"
            }`}
          >
            {inTrip ? <Check size={12} aria-hidden="true" /> : <Plus size={12} aria-hidden="true" />}
            {inTrip ? x("inTrip") : x("addTrip")}
          </button>
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener noreferrer" aria-label="Official website" className="ml-auto text-muted hover:text-azure">
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
