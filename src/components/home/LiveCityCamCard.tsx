"use client";

import { useState } from "react";
import { ExternalLink, Video } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { CITIES, type CitySlug } from "@/lib/data/cities";
import { CITY_CAMS } from "@/lib/data/cityCams";

export default function LiveCityCamCard() {
  const [citySlug, setCitySlug] = useState<CitySlug>("tokyo");
  const cam = CITY_CAMS[citySlug];

  return (
    <WidgetFrame icon={Video} labelKey="citycam.title" accent="mint" live>
      <div className="flex items-center gap-1.5">
        {CITIES.map((city) => (
          <button
            key={city.slug}
            type="button"
            onClick={() => setCitySlug(city.slug)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              citySlug === city.slug
                ? "bg-azure/20 text-azure"
                : "text-muted hover:text-foreground"
            }`}
          >
            {city.name}
          </button>
        ))}
      </div>

      <div className="relative aspect-video w-full flex-1 overflow-hidden rounded-xl bg-[#0a1024]">
        <iframe
          key={cam.videoId}
          src={`https://www.youtube.com/embed/${cam.videoId}?autoplay=1&mute=1&rel=0&playsinline=1`}
          title={`${cam.location} — live`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[#0b0e1a]/85 to-transparent p-3">
          <p className="font-mono text-[10px] text-foreground/80">{cam.location}</p>
          <a
            href={cam.watchUrl}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto flex items-center gap-1 text-[10px] text-foreground/60 hover:text-foreground"
          >
            {cam.source}
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </WidgetFrame>
  );
}
