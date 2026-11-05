"use client";

import { useState } from "react";
import { Bike, Car, Footprints, TrainFront } from "lucide-react";
import { useLazyJson } from "@/components/map/useMapData";
import { formatDistance } from "@/lib/explore/display";
import type { Destination } from "@/lib/explore/types";
import { useExploreLocation } from "@/lib/explore/useExploreLocation";
import { haversineKm } from "@/lib/events/geo";
import { useTranslate } from "@/lib/i18n/inline";

interface GalleryImage {
  url: string;
  thumb: string;
  page: string;
  author: string | null;
  license: string | null;
  title: string;
}

// More photographs from the place's own Wikipedia article, each credited.
export function Gallery({ id, name }: { id: string; name: string }) {
  const tr = useTranslate();
  const { data } = useLazyJson<{ images: GalleryImage[] }>(`/api/explore/gallery?id=${id}`);
  const [bad, setBad] = useState<Set<string>>(new Set());
  const images = (data?.images ?? []).filter((i) => !bad.has(i.url));
  if (images.length === 0) return null;
  return (
    <section aria-label={tr("Photo gallery")} className="flex flex-col gap-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{tr("Photo gallery")}</h2>
        <p className="text-xs text-muted">{tr("Photographs from the place's Wikipedia article on Wikimedia Commons. Tap a photo for its source and licence.")}</p>
      </div>
      <ul className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
        {images.map((img) => (
          <li key={img.url} className="w-64 shrink-0 snap-start sm:w-72">
            <a href={img.page} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-2xl border border-glass-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons images are served by their own thumbnailer */}
              <img
                src={img.thumb}
                alt={`${name} — ${img.title}`}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setBad((b) => new Set(b).add(img.url))}
                className="aspect-[4/3] w-full bg-glass-bg-strong object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
            </a>
            <p className="mt-1 truncate text-[10px] text-muted">{[img.author, img.license].filter(Boolean).join(" · ") || "Wikimedia Commons"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// How far it is from where the visitor is exploring, and one-tap routes in
// each mode. Travel time and fares come from Google Maps when they open it —
// we don't estimate them.
export function GettingThere({ place }: { place: Destination }) {
  const tr = useTranslate();
  const { location } = useExploreLocation();
  const km = location ? Math.round(haversineKm(location.lat, location.lon, place.lat, place.lon) * 10) / 10 : null;
  const base = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
  const origin = location?.mode === "gps" ? `&origin=${location.lat},${location.lon}` : "";
  const modes = [
    { id: "transit", label: "Train & bus", icon: TrainFront },
    { id: "walking", label: "Walking", icon: Footprints },
    { id: "driving", label: "Car", icon: Car },
    { id: "bicycling", label: "Bicycle", icon: Bike },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm text-foreground/90">
        {km !== null && location ? (
          <>
            <span className="font-semibold">{location.mode === "manual" ? `${tr("approx.")} ` : ""}{formatDistance(km)}</span>{" "}
            <span className="text-muted">
              {location.mode === "gps" ? tr("in a straight line from where you are") : tr("in a straight line from the centre of {place}").replace("{place}", location.label)}
            </span>
          </>
        ) : (
          <span className="text-muted">{tr("Set a location on the Explore page to see how far this is.")}</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <a key={m.id} href={`${base}${origin}&travelmode=${m.id}`} target="_blank" rel="noopener noreferrer" className="flex min-h-9 items-center gap-1.5 rounded-full border border-glass-border px-3 text-xs font-medium text-foreground/85 hover:border-azure/40 hover:text-azure">
            <m.icon size={13} aria-hidden="true" />
            {tr(m.label)}
          </a>
        ))}
      </div>
      <p className="text-[11px] text-muted">{tr("Travel times and fares aren't in our data — Google Maps shows them for each mode.")}</p>
    </div>
  );
}
