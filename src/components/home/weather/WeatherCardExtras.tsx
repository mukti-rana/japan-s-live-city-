"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import WeatherIcon from "@/components/ui/WeatherIcon";
import type { HourlyPoint } from "@/lib/services/weather";
import { clockOf } from "@/lib/weather/insights";
import { useTranslate } from "@/lib/i18n/inline";

// The temperature, counting up to the reading (and re-counting when it changes).
export function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const shown = useTransform(mv, (v) => String(Math.round(v)));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const run = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => run.stop();
  }, [value, reduce, mv]);
  return <motion.span>{shown}</motion.span>;
}

const hm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
function jstMinutes(now: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (g("hour") % 24) * 60 + g("minute");
}
const fmt = (text: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), text);

// The day's sun, drawn as an arc from the real sunrise to the real sunset with the sun at its place now, and how long the daylight has left.
function SunArc({ sunrise, sunset }: { sunrise: string; sunset: string }) {
  const tr = useTranslate();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(jstMinutes(Date.now()));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  const sr = hm(sunrise);
  const ss = hm(sunset);
  const day = now !== null && now >= sr && now <= ss;
  const f = now === null ? 0.5 : Math.min(1, Math.max(0, (now - sr) / (ss - sr)));
  // The arc is a half ellipse in a 200 x 64 box; the sun sits on it at fraction f.
  const px = 10 + 180 * f;
  const py = 56 - Math.sin(Math.PI * f) * 46;
  const mins = now === null ? 0 : day ? ss - now : now < sr ? sr - now : sr + 24 * 60 - now;
  const label = now === null ? "" : day ? fmt(tr("{h} h {m} min of daylight left"), { h: Math.floor(mins / 60), m: mins % 60 }) : fmt(tr("Sunrise in {h} h {m} min"), { h: Math.floor(mins / 60), m: mins % 60 });
  return (
    <div className="min-w-0">
      <svg viewBox="0 0 200 64" className="h-16 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="sa-arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffb98a" />
            <stop offset="0.5" stopColor="#ffe3a3" />
            <stop offset="1" stopColor="#ff9a7a" />
          </linearGradient>
        </defs>
        <path d="M10 56 Q100 -36 190 56" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" strokeDasharray="3 4" />
        {day && <path d={`M10 56 Q100 -36 190 56`} fill="none" stroke="url(#sa-arc)" strokeWidth="2.2" strokeLinecap="round" pathLength={1} strokeDasharray={`${f} 1`} />}
        <line x1="4" y1="56" x2="196" y2="56" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {now !== null && day && (
          <>
            <circle cx={px} cy={py} r="9" fill="#ffd27d" opacity="0.25" />
            <circle cx={px} cy={py} r="4.5" fill="#ffe7a8" />
          </>
        )}
      </svg>
      <div className="-mt-1 flex items-center justify-between text-[11px] text-white/80">
        <span>
          ☀ {tr("Sunrise")} <b className="font-medium text-white">{sunrise}</b>
        </span>
        <span>
          {tr("Sunset")} <b className="font-medium text-white">{sunset}</b>
        </span>
      </div>
      {label && <p className="mt-1 text-center text-[11px] text-white/60">{label}</p>}
    </div>
  );
}

// The next hours, from the real forecast: the time, the sky, the temperature and the chance of rain.
function NextHours({ hourly, sunrise, sunset }: { hourly: HourlyPoint[]; sunrise: string; sunset: string }) {
  const tr = useTranslate();
  const hours = hourly.slice(0, 6);
  if (hours.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">{tr("Next hours")}</p>
      <ul className="mt-2 grid grid-cols-6 gap-1.5">
        {hours.map((h, i) => (
          <li key={h.time} className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.06] px-1 py-2 text-center">
            <span className="text-[10px] text-white/65">{i === 0 ? tr("Now") : h.hourLabel}</span>
            <WeatherIcon icon={h.icon} night={clockOf(h.time) < sunrise || clockOf(h.time) >= sunset} size={18} strokeWidth={1.5} aria-hidden="true" />
            <span className="text-xs font-semibold tabular-nums text-white">{Math.round(h.tempC)}°</span>
            <span className={`text-[10px] tabular-nums ${h.precipProbability >= 30 ? "text-sky-300" : "text-white/40"}`}>{h.precipProbability}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The glass strip at the foot of the weather card.
export default function WeatherCardExtras({ sunrise, sunset, hourly }: { sunrise: string; sunset: string; hourly: HourlyPoint[] }) {
  return (
    <div className="relative grid gap-4 rounded-2xl border border-white/10 bg-black/25 p-3.5 backdrop-blur-md sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] sm:items-end">
      <SunArc sunrise={sunrise} sunset={sunset} />
      <NextHours hourly={hourly} sunrise={sunrise} sunset={sunset} />
    </div>
  );
}
