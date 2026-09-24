"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CITIES, type CitySlug } from "@/lib/data/cities";
import { CITY_CAMS } from "@/lib/data/cityCams";

export default function LiveCityCamCard() {
  const { t } = useLanguage();
  const [citySlug, setCitySlug] = useState<CitySlug>("tokyo");
  const cam = CITY_CAMS[citySlug];

  return (
    <GlassCard className="relative overflow-hidden p-0">
      <div className="flex items-center gap-1.5 border-b border-glass-border p-2">
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

      <div className="dark-scene relative aspect-video w-full">
        <iframe
          key={cam.videoId}
          src={`https://www.youtube.com/embed/${cam.videoId}?autoplay=1&mute=1&rel=0&playsinline=1`}
          title={`${cam.location} — live`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-[#0b0e1a]/80 to-transparent p-3">
          <span className="flex items-center gap-1.5 rounded-full bg-mint/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-mint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
            {t("widget.live")}
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[#0b0e1a]/85 to-transparent p-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              <T k="citycam.title" />
            </p>
            <p className="font-mono text-[10px] text-foreground/70">{cam.location}</p>
          </div>
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
    </GlassCard>
  );
}
