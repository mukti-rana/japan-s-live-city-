"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { X } from "@/components/explore/explore-text";
import { useLazyJson } from "@/components/map/useMapData";
import { playfair } from "@/components/home/cinematic/fonts";
import { scopeFor } from "@/lib/explore/filters";
import { placeName, prefectureLabel } from "@/lib/explore/display";
import type { Destination, ExploreResult } from "@/lib/explore/types";
import type { ExploreLocation } from "@/lib/explore/useExploreLocation";
import { HOME_PHOTOS } from "@/lib/data/homePhotos";
import { useInline, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// The Explore page's opening photographs are the places it recommends, not stock pictures:
//   - with a location (Near Me, or a city or prefecture the visitor picked): the best of the places around there, the same ones the
//     "Recommended" list shows first, nearest and best-known together;
//   - with none (All Japan): the best-known places in the country, the ones with a World Heritage listing.
// Each picture is that place's own photograph from the open data (credited), shown with the place's name, where it is, a link to it and the
// photographer's credit, so the picture is never anonymous. They crossfade slowly with a very slow zoom, under a shade that keeps the heading and
// search readable; one place after another, and a row of dots to choose. If the places cannot be loaded, the site's own photographs of Japan stand in
// (with no caption, since they are not a recommendation). It holds still under reduced motion.
const HOLD = 8000;
const FALLBACK = [HOME_PHOTOS.fuji, HOME_PHOTOS.kiyomizu, HOME_PHOTOS.itsukushima, HOME_PHOTOS.fushimi, HOME_PHOTOS.todaiji];

function usePlaces(origin: ExploreLocation | null) {
  const { language } = useLanguage();
  const scope = scopeFor(origin);
  const url = useMemo(() => {
    const p = new URLSearchParams({ lang: language, photo: "1", limit: "6" });
    if (scope === "near" && origin) {
      p.set("sort", "recommended");
      p.set("lat", String(origin.lat));
      p.set("lon", String(origin.lon));
      p.set("radius", "60");
    } else if (scope === "pref" && origin?.prefectureId) {
      p.set("sort", "recommended");
      p.set("pref", origin.prefectureId);
    } else {
      p.set("sort", "popular");
      p.set("heritage", "1");
    }
    return `/api/explore?${p.toString()}`;
  }, [scope, origin, language]);
  const feed = useLazyJson<ExploreResult>(url);
  const items = (feed.data?.items ?? []).filter((d): d is Destination & { image: NonNullable<Destination["image"]> } => Boolean(d.image)).slice(0, 6);
  return { items, scope, loading: feed.loading };
}

export default function ExploreBackdrop({ origin }: { origin: ExploreLocation | null }) {
  const reduced = useReducedMotion();
  const tr = useTranslate();
  const x = useInline(X);
  const { language } = useLanguage();
  const { items, scope } = usePlaces(origin);
  const [i, setI] = useState(0);
  const places = items.length >= 2;
  const count = places ? items.length : FALLBACK.length;
  // A new set of places starts again from the first.
  const [seen, setSeen] = useState("");
  const setKey = items.map((d) => d.id).join("|");
  if (seen !== setKey) {
    setSeen(setKey);
    setI(0);
  }
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % count), HOLD);
    return () => window.clearInterval(id);
  }, [reduced, count, setKey]);

  const current = places ? items[i % items.length] : null;
  const where = current ? [current.city, prefectureLabel(current.prefectureId, language)].filter(Boolean).join(", ") : "";

  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black">
        {places
          ? items.map((d, n) => (
              // eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons pictures are served by their own thumbnailer
              <img
                key={d.id}
                src={d.image.url}
                alt=""
                referrerPolicy="no-referrer"
                loading={n === 0 ? "eager" : "lazy"}
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out ${n === i ? "opacity-100" : "opacity-0"} ${n === i && !reduced ? "explore-kenburns" : ""}`}
              />
            ))
          : FALLBACK.map((p, n) => (
              <div key={p.src} className={`absolute inset-0 transition-opacity duration-[1800ms] ease-in-out ${n === i ? "opacity-100" : "opacity-0"}`}>
                <Image src={p.src} alt="" fill sizes="100vw" priority={n === 0} quality={75} className={`object-cover ${n === i && !reduced ? "explore-kenburns" : ""}`} style={{ objectPosition: p.focus ?? "50% 50%" }} />
              </div>
            ))}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,10,0.55)_0%,rgba(4,5,10,0.25)_35%,rgba(4,5,10,0.78)_78%,#05060c_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,5,10,0.78)_0%,rgba(4,5,10,0.15)_62%,transparent_100%)]" />
      </div>

      {/* Whose photograph this is: the recommended place, with a way into it and a way to choose another. */}
      {current && (
        <div key={current.id} className={`${playfair.variable} explore-caption absolute left-5 top-24 z-10 max-w-[18rem] sm:left-auto sm:right-10 sm:max-w-[22rem] lg:right-14`} style={{ color: "#fff" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em]" style={{ color: "rgba(255,255,255,0.75)" }}>
            {scope === "all" ? tr("Featured destination") : tr("Recommended near you")}
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-home-serif)] text-[clamp(22px,2.2vw,32px)] font-normal leading-[1.08] [text-shadow:0_2px_20px_rgba(0,0,0,0.7)]">{placeName(current, language)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
            <MapPin size={12} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{where}</span>
            {current.distanceKm !== null && scope === "near" ? <span className="shrink-0">· {Math.round(current.distanceKm)} km</span> : null}
          </p>
          <Link href={`/explore/${current.id}`} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" style={{ color: "#fff" }}>
            {x("details")}
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
          <div className="mt-3 flex items-center gap-1.5" role="group" aria-label={tr("Choose a photograph")}>
            {items.map((d, n) => (
              <button key={d.id} type="button" aria-label={placeName(d, language)} aria-pressed={n === i} onClick={() => setI(n)} className={`h-1.5 rounded-full transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${n === i ? "w-7 bg-white" : "w-3 bg-white/40 hover:bg-white/70"}`} />
            ))}
          </div>
          <a href={current.image.page} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-full truncate text-[9px] hover:underline" style={{ color: "rgba(255,255,255,0.55)" }}>
            {x("photoBy")}: {current.image.author ?? "Wikimedia Commons"}
            {current.image.license ? ` · ${current.image.license}` : ""}
          </a>
        </div>
      )}
    </>
  );
}
