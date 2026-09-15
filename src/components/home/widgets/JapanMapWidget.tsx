import Link from "next/link";
import { Globe2, ArrowUpRight } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { mockMapCities } from "@/lib/mock/dashboard";

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

export default function JapanMapWidget() {
  return (
    <WidgetFrame icon={Globe2} label="Japan Map" accent="azure" live>
      <Link
        href="/map"
        aria-label="Open the full interactive Japan map"
        className="relative block h-56 overflow-hidden rounded-xl bg-[#0a1024] transition-opacity hover:opacity-90"
      >
        <svg viewBox="0 0 300 240" className="h-full w-full" aria-hidden="true">
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

          {mockMapCities.map((city) => (
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
        </svg>

        {mockMapCities.map((city) => (
          <div
            key={city.name}
            className="absolute leading-tight"
            style={{
              left: `${((city.x + city.labelDx) / 300) * 100}%`,
              top: `${((city.y + city.labelDy) / 240) * 100}%`,
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
            <p className="text-[10px] tabular-nums text-muted">{city.tempC}°C</p>
          </div>
        ))}

        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-glass-border bg-glass-bg-strong px-2.5 py-1 text-[10px] font-medium text-azure backdrop-blur-sm">
          Open full map
          <ArrowUpRight size={12} />
        </span>
      </Link>
    </WidgetFrame>
  );
}
