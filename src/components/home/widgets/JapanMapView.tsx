"use client";

import { useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useInView } from "motion/react";
import { ArrowUpRight, Globe2 } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { JAPAN_BOUNDS, JAPAN_OUTLINE, JAPAN_VIEW, projectJapan } from "@/lib/map/japanOutline";

const JAPAN_BOUNDS_X0 = JAPAN_BOUNDS.lon0;
import { MAP_CITIES, tempColor } from "@/lib/map/cities";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { resolvePlace } from "@/lib/news/places";
import { useNewsPlace } from "@/lib/news/useNews";
import { localize, useTranslate } from "@/lib/i18n/inline";

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

// Latitudes and longitudes of the fine grid drawn behind the islands, and where Mount Fuji stands.
const PARALLELS = [32, 36, 40, 44];
const MERIDIANS = [130, 134, 138, 142, 146];
const FUJI = { lon: 138.7274, lat: 35.3606 };

// The preview: Japan's real outline, a few cities with their current
// temperature, and the visitor's own city picked out. The full interactive
// map lives at /map.
//
// It draws itself each time it scrolls into view (and again on the way back): the graticule's lines are drawn first, then the coast of every
// island is traced, the land fills in, the other cities' lights come on, Mount Fuji is marked, the six cities drop in one after another with
// their temperatures, and a band of light sweeps across the land once. After that, slow ripples spread from the coast. All of it is CSS
// keyed to data-live (see "Japan map" in cinematic.css); with reduced motion, or before the page is running, the map is simply finished.
export default function JapanMapView({ cities }: { cities: HomeMapCity[] }) {
  const { t, language } = useLanguage();
  const tr = useTranslate();
  const { location } = useLiveLocation();
  const picked = useNewsPlace();

  // The visitor's chosen city first, then the browser's location.
  const placeName = picked.source === "selected" ? picked.place : location?.name ?? picked.place;
  const prefecture = resolvePlace(placeName)?.prefectureId ?? null;
  const active = prefecture ? cities.find((c) => c.prefectureId === prefecture)?.slug ?? null : null;
  const hasReadings = cities.some((c) => c.tempC !== null);

  const ref = useRef<HTMLAnchorElement>(null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const live = useInView(ref, { amount: 0.4 });
  const shown = new Set(cities.map((c) => c.slug));
  const fuji = projectJapan(FUJI.lon, FUJI.lat);
  const follow = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <WidgetFrame icon={Globe2} labelKey="widget.japanMap" accent="azure" viewAll viewAllHref="/map">
      <Link
        ref={ref}
        href="/map"
        data-jm
        data-live={mounted ? String(live) : undefined}
        onPointerMove={follow}
        data-japan-map
        aria-label={t("widget.openFullMap")}
        className="group relative block min-h-[19rem] flex-1 overflow-hidden rounded-xl border border-glass-border bg-[#080d20] transition-colors hover:border-azure/40"
      >
        {/* a soft light under the pointer (a span, so the home page's rule that clears the panel's lighting leaves it alone) */}
        <span aria-hidden="true" className="jm-spot pointer-events-none absolute inset-0" />
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
          <svg viewBox={`0 0 ${JAPAN_VIEW.width} ${JAPAN_VIEW.height}`} className="h-full w-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="jp-land" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2a3f8f" />
                <stop offset="55%" stopColor="#1a2860" />
                <stop offset="100%" stopColor="#121b44" />
              </linearGradient>
              <linearGradient id="jm-sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#9fd0ff" stopOpacity="0" />
                <stop offset="50%" stopColor="#cfe6ff" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#9fd0ff" stopOpacity="0" />
              </linearGradient>
              <filter id="jp-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
              <mask id="jm-land">
                {JAPAN_OUTLINE.map((d, i) => (
                  <path key={i} d={d} fill="#fff" />
                ))}
              </mask>
            </defs>

            {/* the graticule: parallels and meridians, drawn first, with their degrees */}
            <g fill="none" stroke="#7daaff" strokeWidth="0.6" opacity="0.42">
              {PARALLELS.map((lat, i) => {
                const y = projectJapan(JAPAN_BOUNDS_X0, lat).y;
                return <path key={lat} className="jm-draw" pathLength={1} style={{ "--d": 0.05 + i * 0.12 } as React.CSSProperties} d={`M0 ${y.toFixed(1)}H${JAPAN_VIEW.width}`} />;
              })}
              {MERIDIANS.map((lon, i) => {
                const x = projectJapan(lon, 38).x;
                return <path key={lon} className="jm-draw" pathLength={1} style={{ "--d": 0.1 + i * 0.12 } as React.CSSProperties} d={`M${x.toFixed(1)} 0V${JAPAN_VIEW.height}`} />;
              })}
            </g>
            <g className="jm-light" style={{ "--i": 0 } as React.CSSProperties} fill="#a9c6ff" fontSize="7" opacity="0.7">
              {PARALLELS.map((lat) => (
                <text key={lat} x="3" y={(projectJapan(JAPAN_BOUNDS_X0, lat).y - 2).toFixed(1)}>
                  {lat}°N
                </text>
              ))}
              {MERIDIANS.map((lon) => (
                <text key={lon} x={(projectJapan(lon, 38).x + 2).toFixed(1)} y={JAPAN_VIEW.height - 3}>
                  {lon}°E
                </text>
              ))}
            </g>

            {/* ripples spreading from the coast, once the map is drawn */}
            <g fill="none" stroke="#4DA3FF" strokeLinejoin="round">
              {JAPAN_OUTLINE.map((d, i) => (
                <path key={i} className="jm-ripple" d={d} />
              ))}
              {JAPAN_OUTLINE.map((d, i) => (
                <path key={i} className="jm-ripple jm-ripple--late" d={d} />
              ))}
            </g>

            {/* the coast is traced, then the land fills */}
            <g fill="none" stroke="#4DA3FF" strokeWidth="3" opacity="0.45" filter="url(#jp-glow)">
              {JAPAN_OUTLINE.map((d, i) => (
                <path key={i} className="jm-draw" pathLength={1} style={{ "--d": 0.5 + (i % 5) * 0.08 } as React.CSSProperties} d={d} />
              ))}
            </g>
            <g className="jm-fill" fill="url(#jp-land)" opacity="0.95">
              {JAPAN_OUTLINE.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g fill="none" stroke="#6FB4FF" strokeWidth="0.9" strokeLinejoin="round">
              {JAPAN_OUTLINE.map((d, i) => (
                <path key={i} className="jm-draw" pathLength={1} style={{ "--d": 0.5 + (i % 5) * 0.08 } as React.CSSProperties} d={d} />
              ))}
            </g>
            <g className="jm-fill" fill="none" stroke="#dbeaff" strokeWidth="0.35" opacity="0.28" strokeLinejoin="round">
              {JAPAN_OUTLINE.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>

            {/* one band of light sweeps across the land after it is drawn */}
            <g mask="url(#jm-land)">
              <rect className="jm-sweep" x="-70" y="0" width="70" height={JAPAN_VIEW.height} fill="url(#jm-sweep)" />
            </g>

            {/* the other cities' lights come on, and Mount Fuji is marked */}
            {MAP_CITIES.filter((c) => !shown.has(c.slug)).map((c, i) => {
              const { x, y } = projectJapan(c.lon, c.lat);
              return <circle key={c.slug} className="jm-light jm-twinkle" cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.1" fill="#ffd9a0" style={{ "--i": i + 1, filter: "drop-shadow(0 0 3px rgba(255,200,120,0.9))" } as React.CSSProperties} />;
            })}
            <g className="jm-light" style={{ "--i": 8 } as React.CSSProperties}>
              <path d={`M${(fuji.x - 4).toFixed(1)} ${(fuji.y + 3).toFixed(1)}L${fuji.x.toFixed(1)} ${(fuji.y - 4).toFixed(1)}L${(fuji.x + 4).toFixed(1)} ${(fuji.y + 3).toFixed(1)}Z`} fill="#eaf3ff" opacity="0.9" />
              <text x={(fuji.x + 6).toFixed(1)} y={(fuji.y + 2.5).toFixed(1)} fill="#cfe2ff" fontSize="7" opacity="0.85">
                {tr("Mt. Fuji")}
              </text>
            </g>
          </svg>
          {cities.map((city) => {
            const { x, y } = projectJapan(city.lon, city.lat);
            const isActive = city.slug === active;
            const side = LABEL_SIDE[city.slug] ?? "r";
            const labelled = city.slug !== "nagoya" || isActive;
            return (
              <div key={city.slug} className="jm-pin absolute" style={{ left: `${pct(x / JAPAN_VIEW.width)}%`, top: `${pct(y / JAPAN_VIEW.height)}%`, "--i": cities.indexOf(city) } as React.CSSProperties}>
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
                    className={`jm-label absolute top-0 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap leading-none ${side === "r" ? "left-3" : "right-3 flex-row-reverse"}`}
                  >
                    <span className={`text-[11px] font-semibold [text-shadow:0_1px_3px_#050814,0_0_6px_#050814] ${isActive ? "text-[#c4b5fd]" : "text-foreground/90"}`}>
                      {localize(city.name, city.nameJa, language)}
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
            {tr("Your city")}
          </span>
        )}
        {hasReadings && <span className="absolute bottom-3 left-3 text-[10px] text-muted">{tr("Current temperature")} · Open-Meteo</span>}

        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-glass-border bg-glass-bg-strong px-2.5 py-1 text-[10px] font-medium text-azure backdrop-blur-sm transition-colors group-hover:border-azure/50">
          {t("widget.openFullMap")}
          <ArrowUpRight size={12} aria-hidden="true" />
        </span>
      </Link>
    </WidgetFrame>
  );
}
