"use client";

import Link from "next/link";
import { ExternalLink, MapPin, Plus, Check, Sparkles, Award } from "lucide-react";
import PlaceImage from "@/components/explore/PlaceImage";
import { CATEGORY_TONE } from "@/components/explore/categoryIcons";
import { X } from "@/components/explore/explore-text";
import FavoriteButton from "@/components/personalization/FavoriteButton";
import { playfair } from "@/components/home/cinematic/fonts";
import { CATEGORY_BY_ID, pickLabel } from "@/lib/explore/categories";
import { formatDistance, placeAbout, placeName, placeNameJa, prefectureLabel } from "@/lib/explore/display";
import type { Destination } from "@/lib/explore/types";
import { useTrip } from "@/lib/explore/useTrip";
import { useInline, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// One destination, magazine-style: the place's own photograph fills the card, with its name, where it is and what kind of place it is
// set over a soft shade at the foot. Pointing at (or focusing) a card zooms the photograph slowly and slides up the introduction.
// The photograph is the place's own (credited); the badges and distance are real data; the introduction is Wikipedia's.
//   standard  a portrait card (4:5), for rows and result lists
//   landscape portrait on a phone, square on a wide screen (a square, for the small cards of a magazine spread)
//   feature   fills whatever space it is given (the big card of a magazine spread), with a serif title and the introduction always shown
export default function DestinationCard({
  place,
  approximateDistance = false,
  compact = false,
  variant = "standard",
}: {
  place: Destination;
  // True when the distance is measured from a city the visitor picked.
  approximateDistance?: boolean;
  compact?: boolean;
  variant?: "standard" | "feature" | "landscape";
}) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const x = useInline(X);
  const trip = useTrip();
  const name = placeName(place, language);
  const ja = placeNameJa(place, language);
  const about = placeAbout(place, language);
  const category = CATEGORY_BY_ID.get(place.category);
  const accent = CATEGORY_TONE[place.category]?.[2] ?? "#bba6ff";
  const inTrip = trip.has(place.id);
  const feature = variant === "feature";
  const where = [place.city, prefectureLabel(place.prefectureId, language)].filter(Boolean).join(", ");

  return (
    <article
      className={`group/card keep-dark-ink relative isolate flex flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c11] shadow-[0_18px_44px_-26px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_28px_60px_-24px_rgba(0,0,0,0.95)] focus-within:border-white/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${feature ? "h-full min-h-[24rem]" : compact ? "aspect-[16/11]" : variant === "landscape" ? "aspect-[4/5] lg:aspect-square" : "aspect-[4/5]"}`}
      style={{ color: "#fff" }}
    >
      {/* The photograph, filling the card, zooming slowly on hover. */}
      <Link href={`/explore/${place.id}`} aria-label={`${x("details")}: ${name}`} className="absolute inset-0 -z-20 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azure">
        <PlaceImage image={place.image} category={place.category} alt={place.image ? name : ""} className="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.08] group-focus-within/card:scale-[1.08] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100" />
      </Link>
      {/* The shade: light at the top, deep at the foot so the words read on any photograph. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.38)_0%,transparent_30%,rgba(5,6,12,0.55)_58%,rgba(5,6,12,0.94)_100%)] transition-opacity duration-500 group-hover/card:opacity-100" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 group-focus-within/card:opacity-100" style={{ background: `linear-gradient(0deg, ${accent}33, transparent)` }} />

      {/* Top: real badges, and the favourite button. */}
      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        {place.worldHeritage && (
          <span className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md" style={{ color: "#f2c572" }}>
            <Award size={11} aria-hidden="true" />
            {x("heritageBadge")}
          </span>
        )}
        {place.hiddenGem && (
          <span className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md" style={{ color: "#d4c8ff" }}>
            <Sparkles size={11} aria-hidden="true" />
            {x("hiddenBadge")}
          </span>
        )}
      </div>
      <FavoriteButton kind="place" itemKey={`wd:${place.id}`} className="absolute right-3 top-3" />

      {/* Foot: what it is, its name, where it is, and the actions. */}
      <div className={`relative flex min-w-0 flex-col gap-1.5 ${feature ? "p-5 sm:p-7" : "p-4"}`}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]" style={{ color: "rgba(255,255,255,0.82)" }}>
          <span className="rounded-full px-2.5 py-0.5 font-semibold backdrop-blur-sm" style={{ background: `linear-gradient(${accent}38, ${accent}38), rgba(5,6,12,0.55)`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}66` }}>
            {category ? pickLabel(category.label, language) : ""}
          </span>
          {place.distanceKm !== null && (
            <span className="font-medium">
              {approximateDistance ? `${x("approx")} ` : ""}
              {formatDistance(place.distanceKm)}
            </span>
          )}
        </div>

        <h3 className={`${playfair.variable} font-[family-name:var(--font-home-serif)] font-normal leading-[1.08] tracking-[-0.01em] [text-shadow:0_2px_18px_rgba(0,0,0,0.6)] ${feature ? "text-[clamp(28px,3.2vw,46px)]" : "line-clamp-2 text-[1.2rem]"}`}>
          <Link href={`/explore/${place.id}`} className="focus-visible:outline-none focus-visible:underline">
            {name}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.78)" }}>
          <MapPin size={12} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{where}</span>
          {ja && <span className="ml-1 shrink-0 font-jp text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>{ja}</span>}
        </p>

        {/* The introduction: always on the feature card; on the others it slides up when the card is pointed at or focused. */}
        {!compact && about && (
          <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${feature ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 group-hover/card:grid-rows-[1fr] group-hover/card:opacity-100 group-focus-within/card:grid-rows-[1fr] group-focus-within/card:opacity-100 max-sm:grid-rows-[0fr]"}`}>
            <p className={`overflow-hidden text-xs leading-relaxed ${feature ? "line-clamp-4 max-w-[52ch] sm:text-sm" : "line-clamp-3"} ${about.language === "ja" ? "font-jp" : ""}`} style={{ color: "rgba(255,255,255,0.82)" }}>
              {about.text}
            </p>
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Link href={`/explore/${place.id}`} className="rounded-full border border-white/35 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" style={{ color: "#fff" }}>
            {x("details")}
          </Link>
          <button
            type="button"
            onClick={() => trip.toggle(place.id)}
            disabled={!inTrip && trip.full}
            aria-pressed={inTrip}
            className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
            style={inTrip ? { borderColor: `${accent}99`, background: `${accent}2a`, color: accent } : { borderColor: "rgba(255,255,255,0.28)", background: "rgba(0,0,0,0.25)", color: "#fff" }}
          >
            {inTrip ? <Check size={12} aria-hidden="true" /> : <Plus size={12} aria-hidden="true" />}
            {inTrip ? x("inTrip") : x("addTrip")}
          </button>
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener noreferrer" aria-label={tr("Official website")} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white">
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </div>
        {place.image && (
          <a
            href={place.image.page}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-full truncate text-[9px] hover:underline"
            style={{ color: "rgba(255,255,255,0.5)" }}
            title={`${x("photoBy")}: ${[place.image.author, place.image.license].filter(Boolean).join(" · ") || "Wikimedia Commons"}`}
          >
            {x("photoBy")}: {place.image.author ?? "Wikimedia Commons"}
            {place.image.license ? ` · ${place.image.license}` : ""}
          </a>
        )}
      </div>
    </article>
  );
}
