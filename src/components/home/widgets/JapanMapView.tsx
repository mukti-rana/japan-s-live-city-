"use client";

import Link from "next/link";
import { Globe2, ArrowUpRight } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { MapCityLayout } from "@/lib/data/mapCities";

// Stylised dotted archipelago — a real interactive map lives at /map.
// Each path is a band of the island chain; duplicating with small offsets
// gives the landmass a dot-matrix thickness.
const ISLANDS = [
  // Kyushu
  "M34 214 q10 -12 22 -12 t20 -10",
  // Shikoku
  "M84 200 q12 -4 24 -6",
  // Honshu — west through Kansai
  "M70 200 q26 -6 48 -20 t40 -22",
  // Honshu — Kanto through Tohoku
  "M158 158 q20 -10 34 -26 t26 -34",
  // Northern Tohoku
  "M218 98 q8 -14 14 -26",
  // Hokkaido
  "M238 66 q14 -18 30 -20 t18 6",
  "M244 76 q16 -14 32 -14",
];

const OFFSETS = [
  { x: 0, y: 0 },
  { x: 0, y: 7 },
  { x: 0, y: -7 },
  { x: 4, y: 14 },
];

export interface MapCityWithTemp extends MapCityLayout {
  tempC: number | null;
}

// The archipelago is drawn in a 300-wide space; it is centred inside a wider
// 520x240 canvas so the card stays short and wide beside the Live City Cam
// instead of growing tall. On narrow screens the side margins are cropped
// away (see the wrapper below) so the map doesn't shrink on a phone.
const CANVAS_W = 520;
const CANVAS_H = 240;
const OFFSET_X = (CANVAS_W - 300) / 2;

export default function JapanMapView({ cities }: { cities: MapCityWithTemp[] }) {
  const { t } = useLanguage();

  return (
    <WidgetFrame icon={Globe2} labelKey="widget.japanMap" accent="azure" viewAll viewAllHref="/map">
      <Link
        href="/map"
        aria-label={t("widget.openFullMap")}
        className="relative block aspect-[1.31] overflow-hidden rounded-xl bg-[#0a1024] transition-opacity hover:opacity-90 md:aspect-[520/240]"
      >
        <div className="absolute inset-y-0 left-1/2 w-[165%] -translate-x-1/2 md:left-0 md:w-full md:translate-x-0">
          <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className="h-full w-full" aria-hidden="true">
            <g transform={`translate(${OFFSET_X} 0)`}>
              {OFFSETS.map((offset, oi) => (
                <g
                  key={oi}
                  transform={`translate(${offset.x} ${offset.y})`}
                  stroke="#4DA3FF"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray="0.1 7"
                  fill="none"
                  opacity={oi === 0 ? 0.55 : 0.3}
                >
                  {ISLANDS.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </g>
              ))}

              {cities.map((city) => (
                <g key={city.name}>
                  {city.active && (
                    <>
                      <circle cx={city.x} cy={city.y} r="13" fill="#FF6B9D" opacity="0.15" />
                      <circle cx={city.x} cy={city.y} r="8" fill="#FF6B9D" opacity="0.3" />
                    </>
                  )}
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={city.active ? 4.5 : 3}
                    fill={city.active ? "#FF6B9D" : "#7DD3FC"}
                  />
                </g>
              ))}
            </g>
          </svg>

          {cities.map((city) => (
            <div
              key={city.name}
              className="absolute leading-tight"
              style={{
                left: `${((city.x + city.labelDx + OFFSET_X) / CANVAS_W) * 100}%`,
                top: `${((city.y + city.labelDy) / CANVAS_H) * 100}%`,
                transform: city.labelAnchor === "end" ? "translateX(-100%)" : undefined,
              }}
            >
              <p
                className={`whitespace-nowrap text-[10px] font-medium ${
                  city.active ? "text-sakura" : "text-foreground/85"
                }`}
              >
                {city.name}
              </p>
              {city.tempC !== null && (
                <p className="text-[10px] tabular-nums text-muted">{city.tempC}°C</p>
              )}
            </div>
          ))}
        </div>

        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-glass-border bg-glass-bg-strong px-2.5 py-1 text-[10px] font-medium text-azure backdrop-blur-sm">
          {t("widget.openFullMap")}
          <ArrowUpRight size={12} />
        </span>
      </Link>
    </WidgetFrame>
  );
}
