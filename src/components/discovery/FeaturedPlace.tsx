"use client";

import Link from "next/link";
import { Clock, ExternalLink, MapPin, Navigation, Sparkles } from "lucide-react";
import PlaceImage from "@/components/explore/PlaceImage";
import FavoriteButton from "@/components/personalization/FavoriteButton";
import { reasonsFor, typicalSeasons } from "@/components/discovery/reasons";
import { directionsUrl } from "@/lib/discovery/discovery";
import { CATEGORY_BY_ID, pickLabel } from "@/lib/explore/categories";
import { formatDistance, placeAbout, placeName, placeNameJa, prefectureLabel } from "@/lib/explore/display";
import type { Destination } from "@/lib/explore/types";
import { useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// The one large recommendation. Everything shown is from the catalogue; what
// the open data does not hold (hours, prices, ratings, travel time) is not
// shown, and one line says so.
export default function FeaturedPlace({ place, approximate, month }: { place: Destination; approximate: boolean; month: number }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const name = placeName(place, language);
  const ja = placeNameJa(place, language);
  const about = placeAbout(place, language);
  const category = CATEGORY_BY_ID.get(place.category);
  const reasons = reasonsFor(place, tr, language, month, 4);
  const seasons = typicalSeasons(place, language);

  return (
    <article className="grid overflow-hidden rounded-2xl border border-azure/30 bg-gradient-to-br from-azure/10 via-glass-bg to-neon-purple/10 shadow-[0_0_40px_-18px_rgba(124,92,255,0.6)] lg:grid-cols-[1.25fr_1fr]">
      <div className="relative min-h-64 lg:min-h-[22rem]">
        <Link href={`/explore/${place.id}`} aria-label={`${tr("View details")}: ${name}`} className="absolute inset-0 block">
          <PlaceImage image={place.image} category={place.category} alt={place.image ? name : ""} className="h-full w-full" />
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0e1a]/85 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#0b0e1a]/30" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-[#c4b5fd] backdrop-blur-sm">
          <Sparkles size={12} aria-hidden="true" />
          {tr("Featured today")}
        </span>
        <FavoriteButton kind="place" itemKey={`wd:${place.id}`} className="absolute right-3 top-3" />
        {place.image && (
          <a
            href={place.image.page}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 left-3 max-w-[80%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[9px] text-white/80 hover:text-white"
          >
            {tr("Photo")}: {place.image.author ?? "Wikimedia Commons"}
            {place.image.license ? ` · ${place.image.license}` : ""}
          </a>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted">
          {category && <span className="rounded-full bg-azure/15 px-2 py-0.5 font-medium text-azure">{pickLabel(category.label, language)}</span>}
          <span className="flex items-center gap-1">
            <MapPin size={11} aria-hidden="true" />
            {[place.city, prefectureLabel(place.prefectureId, language)].filter(Boolean).join(", ")}
          </span>
          {place.distanceKm !== null && (
            <span className="font-semibold text-foreground/85">
              {approximate ? `${tr("approx.")} ` : ""}
              {formatDistance(place.distanceKm)}
            </span>
          )}
        </div>

        <h3 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
          {name}
          {ja && <span className="ml-2 font-jp text-sm font-normal text-muted">{ja}</span>}
        </h3>

        {about && <p className={`line-clamp-4 text-sm leading-relaxed text-foreground/75 ${about.language === "ja" ? "font-jp" : ""}`}>{about.text}</p>}

        {reasons.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#c4b5fd]">{tr("Why it's worth a visit")}</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-xs text-foreground/80">
              {reasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-azure" aria-hidden="true" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {seasons && (
          <p className="flex items-start gap-1.5 text-xs text-foreground/75">
            <Clock size={13} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground/90">{tr("Best time to visit")}:</span> {seasons}{" "}
              <span className="text-muted">({tr("typical for this kind of place")})</span>
            </span>
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-muted">{tr("Opening hours, admission prices and ratings aren't in our open data, so we don't show them — check the official website before you go.")}</p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Link href={`/explore/${place.id}`} className="flex min-h-10 items-center rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {tr("View details")}
          </Link>
          <a href={directionsUrl(place)} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-1.5 rounded-full border border-azure/40 px-4 text-sm font-semibold text-azure transition-colors hover:bg-azure/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Navigation size={14} aria-hidden="true" />
            {tr("Get directions")}
          </a>
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-1.5 rounded-full border border-glass-border px-3.5 text-sm font-medium text-foreground/85 hover:border-azure/40">
              <ExternalLink size={14} aria-hidden="true" />
              {tr("Official website")}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
