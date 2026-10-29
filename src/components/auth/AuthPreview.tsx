"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CloudSun, Globe2, TrainFront, type LucideIcon } from "lucide-react";
import { CITIES } from "@/lib/data/cities";
import type { WeatherSnapshot } from "@/lib/services/weather";

const PREVIEW_CITY = CITIES.find((c) => c.slug === "tokyo")!;

interface PreviewItem {
  icon: LucideIcon;
  title: string;
  text: string;
  tint: string;
  live?: boolean;
}

// A compact look at what's inside, so a first-time visitor knows what they're
// entering. Only the weather card carries a number, and only when a real
// reading arrives from the same Open-Meteo-backed route the home page uses —
// trains and events here are descriptions, never invented figures.
export default function AuthPreview() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weather/live?lat=${PREVIEW_CITY.lat}&lon=${PREVIEW_CITY.lon}`)
      .then((r) => (r.ok ? (r.json() as Promise<WeatherSnapshot>) : null))
      .then((data) => {
        if (!cancelled && data) setWeather(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const items: PreviewItem[] = [
    {
      icon: CloudSun,
      title: "Weather",
      text: weather ? `${PREVIEW_CITY.name} ${weather.tempC}°C · ${weather.condition}` : "Current conditions & forecasts",
      tint: "bg-azure/15 text-azure",
      live: Boolean(weather),
    },
    {
      icon: TrainFront,
      title: "Train Status",
      text: "Delays & railway updates",
      tint: "bg-neon-purple/15 text-neon-purple",
    },
    {
      icon: Globe2,
      title: "Japan Map",
      text: "Cities & places to explore",
      tint: "bg-neon-cyan/15 text-neon-cyan",
    },
    {
      icon: CalendarDays,
      title: "Events",
      text: "Festivals & cultural experiences",
      tint: "bg-sakura/15 text-sakura",
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:gap-3" aria-label="What's inside LIVE CITY">
      {items.map(({ icon: Icon, title, text, tint, live }) => (
        <li
          key={title}
          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0b0e1a]/60 p-3 backdrop-blur-md sm:p-3.5"
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>
            <Icon size={17} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              {title}
              {live && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]"
                  title="Live reading"
                />
              )}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-foreground/65">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
