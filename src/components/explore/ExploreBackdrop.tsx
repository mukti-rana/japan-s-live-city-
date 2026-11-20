"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
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
// The photograph is fixed to the screen behind the whole page, so it stays full screen as the page scrolls (the sections below glide over it);
// the caption belongs to the hero and scrolls away with it. `ExplorePhotos` holds the state, `ExploreBackdrop` is the photograph, `ExploreCaption` the words.
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

// The words' colours are worked out from each photograph on the server (see /api/explore/ink): a tint of a hue the picture really contains, light enough
// to read against it at WCAG contrast 4.5, with a soft dark glow behind the words only as deep as the picture needs. One set for a wide screen, one for a phone.
type Ink = { hue: number; glow: number; eyebrow: string; name: string; meta: string; credit: string };
type Inks = { wide: Ink; narrow: Ink };
const inkLoads = new Map<string, Promise<Inks | null>>();
function loadInk(id: string): Promise<Inks | null> {
  let p = inkLoads.get(id);
  if (!p) {
    p = fetch(`/api/explore/ink?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Inks>) : null))
      .catch(() => null)
      .then((v) => {
        if (!v) inkLoads.delete(id); // a failure is tried again next time, not remembered
        return v;
      });
    inkLoads.set(id, p);
  }
  return p;
}
function useInk(id: string | null): Ink | null {
  const [got, setGot] = useState<{ id: string; inks: Inks } | null>(null);
  const wide = useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(min-width: 640px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 640px)").matches,
    () => true,
  );
  useEffect(() => {
    if (!id) return;
    let live = true;
    void loadInk(id).then((inks) => {
      if (live && inks) setGot({ id, inks });
    });
    return () => {
      live = false;
    };
  }, [id]);
  return got && got.id === id ? (wide ? got.inks.wide : got.inks.narrow) : null;
}

type PhotoState = {
  items: ReturnType<typeof usePlaces>["items"];
  scope: ReturnType<typeof usePlaces>["scope"];
  i: number;
  setI: (n: number) => void;
  places: boolean;
};
const PhotoCtx = createContext<PhotoState | null>(null);

export function ExplorePhotos({ origin, children }: { origin: ExploreLocation | null; children: ReactNode }) {
  const reduced = useReducedMotion();
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
  const value = useMemo(() => ({ items, scope, i, setI, places }), [items, scope, i, places]);
  return <PhotoCtx.Provider value={value}>{children}</PhotoCtx.Provider>;
}

function usePhotos(): PhotoState {
  const v = useContext(PhotoCtx);
  if (!v) throw new Error("ExplorePhotos is missing");
  return v;
}

// The photograph: fixed to the screen, behind everything, under a shade that keeps the words readable.
export default function ExploreBackdrop() {
  const reduced = useReducedMotion();
  const { items, i, places } = usePhotos();
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 bg-black">
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,10,0.55)_0%,rgba(4,5,10,0.25)_35%,rgba(4,5,10,0.7)_80%,rgba(4,5,10,0.85)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,5,10,0.7)_0%,rgba(4,5,10,0.12)_62%,transparent_100%)]" />
    </div>
  );
}

// Whose photograph this is: the recommended place, with a way into it and a way to choose another.
export function ExploreCaption({ className = "" }: { className?: string }) {
  const tr = useTranslate();
  const x = useInline(X);
  const { language } = useLanguage();
  const { items, scope, i, setI, places } = usePhotos();
  const current = places ? items[i % items.length] : null;
  const ink = useInk(current?.id ?? null);
  if (!current) return null;
  const where = [current.city, prefectureLabel(current.prefectureId, language)].filter(Boolean).join(", ");
  return (
    <div key={current.id} className={`${playfair.variable} explore-caption isolate max-w-[18rem] sm:max-w-[22rem] ${className}`} style={{ color: "#fff" }}>
      {/* A soft dark glow behind the words, only as deep as this photograph needs for the colours to read. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10" style={{ background: `radial-gradient(closest-side, rgba(4,5,10,${ink?.glow ?? 0.2}) 45%, transparent)`, transition: "background 1.4s ease" }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em]" style={{ color: ink?.eyebrow ?? "rgba(255,255,255,0.75)", transition: "color 1.4s ease" }}>
          {scope === "all" ? tr("Featured destination") : tr("Recommended near you")}
        </p>
        <p className="mt-1.5 font-[family-name:var(--font-home-serif)] text-[clamp(22px,2.2vw,32px)] font-normal leading-[1.08] [text-shadow:0_2px_20px_rgba(0,0,0,0.7)]" style={{ color: ink?.name, transition: "color 1.4s ease" }}>{placeName(current, language)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: ink?.meta ?? "rgba(255,255,255,0.8)", transition: "color 1.4s ease" }}>
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
        <a href={current.image.page} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-full truncate text-[9px] hover:underline" style={{ color: ink?.credit ?? "rgba(255,255,255,0.6)", transition: "color 1.4s ease" }}>
          {x("photoBy")}: {current.image.author ?? "Wikimedia Commons"}
          {current.image.license ? ` · ${current.image.license}` : ""}
        </a>
    </div>
  );
}
