"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Camera, LocateFixed, LocateOff, MessageSquareText, Navigation, Star } from "lucide-react";
import Bi from "@/components/community/Bi";
import PlaceTypeIcon from "@/components/community/PlaceTypeIcon";
import PlacesMap from "@/components/community/PlacesMapLoader";
import { AREA_BY_ID } from "@/lib/community/areas";
import { PLACE_CATEGORY_BY_ID, distanceKm, googleDirectionsUrl, type CommunityPlace } from "@/lib/community/placeTypes";
import { useTranslate } from "@/lib/i18n/inline";
import Tx from "@/components/i18n/Tx";

export interface ExplorerPlace {
  place: CommunityPlace;
  reviews: number;
  posts: number;
  questions: number;
  average: number | null;
}

type Me = { lat: number; lon: number } | null;

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

// The places list and map. "Near me" is optional and never asked for on its own:
// it runs only when the visitor presses the button, the position is used right
// here in the browser to sort by distance, and it is never sent, stored or shown.
export default function PlacesExplorer({ places, view }: { places: ExplorerPlace[]; view: "list" | "map" }) {
  const tr = useTranslate();
  const [me, setMe] = useState<Me>(null);
  const [geo, setGeo] = useState<"idle" | "asking" | "denied" | "unsupported" | "failed">("idle");
  const [selected, setSelected] = useState<string | null>(null);

  const ordered = useMemo(() => {
    if (!me) return places.map((p) => ({ ...p, km: null as number | null }));
    return places.map((p) => ({ ...p, km: distanceKm(me, p.place) })).sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
  }, [places, me]);

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeo("unsupported");
      return;
    }
    setGeo("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeo("idle");
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const chosen = ordered.find((p) => p.place.ref === selected) ?? null;

  const card = (p: (typeof ordered)[number], i: number) => {
    const area = AREA_BY_ID.get(p.place.areaId);
    return (
      <li key={p.place.ref} className="relative">
        <article className={`group relative flex h-full flex-col gap-2.5 rounded-2xl border bg-panel/70 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${selected === p.place.ref ? "border-azure/60" : "border-glass-border"}`}>
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-azure/15 text-azure">
              <PlaceTypeIcon category={p.place.category} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold leading-snug text-foreground">
                <Link href={`/community/place/${p.place.ref}`} className={`break-words after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-azure ${ring}`}>
                  {view === "map" ? <span className="mr-1.5 text-xs text-foreground/60">{i + 1}.</span> : null}
                  {p.place.name}
                </Link>
              </h3>
              <p className="mt-0.5 break-words text-xs text-foreground/80">
                {p.place.address ?? p.place.city}
                {(p.place.address ?? p.place.city) && area ? " · " : ""}
                {area && <Bi en={area.en} ja={area.ja} />}
              </p>
            </div>
            {p.km !== null && <span className="shrink-0 rounded-full bg-azure/15 px-2 py-0.5 text-[11px] font-medium text-azure">{p.km < 1 ? `${Math.round(p.km * 1000)} m` : `${p.km.toFixed(1)} km`}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/85">
            <span className="rounded-full border border-lilac/40 bg-lilac/10 px-2 py-0.5 font-medium text-lilac">
              <Bi en={PLACE_CATEGORY_BY_ID.get(p.place.category)?.en ?? "Place"} ja={PLACE_CATEGORY_BY_ID.get(p.place.category)?.ja ?? "場所"} />
            </span>
            {p.reviews > 0 && p.average !== null && (
              <span className="inline-flex items-center gap-1">
                <Star size={12} aria-hidden="true" className="text-gold" fill="currentColor" />
                {p.average.toFixed(1)} ({p.reviews})
              </span>
            )}
            {p.posts > 0 && (
              <span className="inline-flex items-center gap-1">
                <Camera size={12} aria-hidden="true" />
                {p.posts}
              </span>
            )}
            {p.questions > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquareText size={12} aria-hidden="true" />
                {p.questions}
              </span>
            )}
          </div>
          <a href={googleDirectionsUrl(p.place)} target="_blank" rel="noopener noreferrer" className={`relative z-10 inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-glass-border bg-glass-bg px-3 text-xs font-medium text-foreground transition-colors hover:border-white/30 ${ring}`}>
            <Navigation size={13} aria-hidden="true" />
            <Tx en="Get Directions" />
          </a>
        </article>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-glass-border bg-glass-bg px-4 py-3">
        {me ? (
          <>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-azure">
              <LocateFixed size={15} aria-hidden="true" />
              <Tx en="Sorted by distance from you" />
            </span>
            <button type="button" onClick={() => setMe(null)} className={`inline-flex h-10 items-center gap-1.5 rounded-xl border border-glass-border bg-glass-bg px-3.5 text-xs font-medium text-foreground transition-colors hover:border-white/30 ${ring}`}>
              <LocateOff size={13} aria-hidden="true" />
              <Tx en="Stop using my location" />
            </button>
          </>
        ) : (
          <button type="button" onClick={locate} disabled={geo === "asking"} className={`inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70 ${ring}`}>
            <LocateFixed size={15} aria-hidden="true" />
            {geo === "asking" ? tr("Finding you…") : tr("Show places near me")}
          </button>
        )}
        <p className="min-w-0 flex-1 text-xs text-foreground/75">
          {geo === "denied" ? tr("No problem — location stays off. Choose a prefecture above instead.") : geo === "unsupported" ? tr("This browser can't share a location. Choose a prefecture above instead.") : geo === "failed" ? tr("We couldn't find your position. Choose a prefecture above instead.") : tr("Optional. Your position stays in your browser: it is never saved, sent or shown to anyone.")}
        </p>
      </div>

      {places.length === 0 ? null : view === "map" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <PlacesMap items={ordered.map((p) => ({ ref: p.place.ref, lat: p.place.lat, lon: p.place.lon }))} me={me} selected={selected} onSelect={setSelected} fitKey={`${places.length}:${places[0]?.place.ref}:${me ? "me" : ""}`} />
          <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
            {chosen && <ul>{card(chosen, ordered.indexOf(chosen))}</ul>}
            <ul className="grid gap-3">{ordered.filter((p) => p.place.ref !== selected).slice(0, 12).map((p) => card(p, ordered.indexOf(p)))}</ul>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{ordered.map((p, i) => card(p, i))}</ul>
      )}
    </div>
  );
}
