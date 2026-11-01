"use client";

import Link from "next/link";
import { ArrowUpRight, Globe2 } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { JAPAN_OUTLINE, JAPAN_VIEW, projectJapan } from "@/lib/map/japanOutline";
import { tempColor } from "@/lib/map/cities";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { resolvePlace } from "@/lib/news/places";
import { useNewsPlace } from "@/lib/news/useNews";

export interface HomeMapCity {
  slug: string;
  name: string;
  nameJa: string;
  prefectureId: string;
  lat: number;
  lon: number;
  tempC: number | null;
  updatedAt: string | null;
}

// Whole-number-friendly percentages, so the server and browser print the same text.
const pct = (fraction: number) => Math.round(fraction * 10000) / 100;

// Which side of its dot each city's label sits on, so labels stay on the sea
// side of the coast and clear of each other.
const LABEL_SIDE: Record<string, "l" | "r"> = {
  sapporo: "l",
  sendai: "r",
  tokyo: "r",
  nagoya: "l",
  osaka: "l",
  fukuoka: "l",
};

// The preview: Japan's real outline, a few cities with their current
// temperature, and the visitor's own city picked out. The full interactive
// map lives at /map.
export default function JapanMapView({ cities }: { cities: HomeMapCity[] }) {
  const { t, language } = useLanguage();
  const { location } = useLiveLocation();
  const picked = useNewsPlace();

  // The visitor's chosen city first, then the browser's location.
  const placeName = picked.source === "selected" ? picked.place : location?.name ?? picked.place;
  const prefecture = resolvePlace(placeName)?.prefectureId ?? null;
  const active = prefecture ? cities.find((c) => c.prefectureId === prefecture)?.slug ?? null : null;
  const hasReadings = cities.some((c) => c.tempC !== null);

  return (
    <WidgetFrame icon={Globe2} labelKey="widget.japanMap" accent="azure" live={hasReadings} viewAll viewAllHref="/map">
      <Link
        href="/map"
        aria-label={t("widget.openFullMap")}
        className="group relative block min-h-[19rem] flex-1 overflow-hidden rounded-xl border border-glass-border bg-[#080d20] transition-colors hover:border-azure/40"
      >
        {/* Soft blue and violet lighting behind the islands */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60%_55%_at_62%_38%,rgba(77,163,255,0.22),transparent_70%),radial-gradient(50%_45%_at_30%_78%,rgba(139,92,246,0.2),transparent_72%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(125,170,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(125,170,255,0.5)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(70%_70%_at_50%_50%,black,transparent)]"
        />

        <div className="absolute inset-y-2 left-1/2 aspect-[400/440.8] -translate-x-1/2">
          <svg viewBox={`0 0 ${JAPAN_VIEW.width} ${JAPAN_VIEW.height}`} className="h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="jp-land" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#24357a" />
                <stop offset="100%" stopColor="#141e4a" />
              </linearGradient>
              <filter id="jp-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>
            <g fill="none" stroke="#4DA3FF" strokeWidth="3" opacity="0.45" filter="url(#jp-glow)">
              {JAPAN_OUTLINE.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g fill="url(#jp-land)" stroke="#6FB4FF" strokeWidth="0.9" strokeLinejoin="round" opacity="0.95">
              {JAPAN_OUTLINE.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </svg>

          {cities.map((city) => {
            const { x, y } = projectJapan(city.lon, city.lat);
            const isActive = city.slug === active;
            const side = LABEL_SIDE[city.slug] ?? "r";
            const labelled = city.slug !== "nagoya" || isActive;
            return (
              <div key={city.slug} className="absolute" style={{ left: `${pct(x / JAPAN_VIEW.width)}%`, top: `${pct(y / JAPAN_VIEW.height)}%` }}>
                <span
                  aria-hidden="true"
                  className={`absolute -left-2 -top-2 h-4 w-4 rounded-full border motion-safe:animate-ping ${isActive ? "border-neon-purple/80" : "border-azure/50"}`}
                  style={{ animationDuration: isActive ? "2.4s" : "3.6s" }}
                />
                <span
                  aria-hidden="true"
                  className={`absolute -left-[5px] -top-[5px] h-2.5 w-2.5 rounded-full border-2 border-[#080d20] ${isActive ? "bg-[#c4b5fd] shadow-[0_0_12px_3px_rgba(167,139,250,0.75)]" : "bg-[#7dd3fc] shadow-[0_0_8px_2px_rgba(77,163,255,0.6)]"}`}
                />
                {labelled && (
                  <span
                    className={`absolute top-0 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap leading-none ${side === "r" ? "left-3" : "right-3 flex-row-reverse"}`}
                  >
                    <span className={`text-[11px] font-semibold [text-shadow:0_1px_3px_#050814,0_0_6px_#050814] ${isActive ? "text-[#c4b5fd]" : "text-foreground/90"}`}>
                      {language === "ja" ? city.nameJa : city.name}
                    </span>
                    {city.tempC !== null && (
                      <span
                        className="rounded-full border bg-[#0b1026]/90 px-1.5 py-[3px] text-[10px] font-bold tabular-nums text-foreground"
                        style={{ borderColor: tempColor(city.tempC) }}
                      >
                        {city.tempC}°
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {active && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-neon-purple/40 bg-[#0b1026]/80 px-2.5 py-1 text-[10px] font-medium text-[#c4b5fd] backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c4b5fd]" aria-hidden="true" />
            {language === "ja" ? "あなたの都市" : "Your city"}
          </span>
        )}
        {hasReadings && <span className="absolute bottom-3 left-3 text-[10px] text-muted">{language === "ja" ? "現在の気温 · Open-Meteo" : "Current temperature · Open-Meteo"}</span>}

        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-glass-border bg-glass-bg-strong px-2.5 py-1 text-[10px] font-medium text-azure backdrop-blur-sm transition-colors group-hover:border-azure/50">
          {t("widget.openFullMap")}
          <ArrowUpRight size={12} aria-hidden="true" />
        </span>
      </Link>
    </WidgetFrame>
  );
}
