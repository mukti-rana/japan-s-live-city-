"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import WeatherIcon from "@/components/ui/WeatherIcon";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";
import { clockOf } from "@/lib/weather/insights";
import { weekdayLabel } from "@/lib/weather/time";
import type { ForecastDay, HourlyPoint, WeatherIconKind } from "@/lib/services/weather";

// A smooth curve through the points (Catmull-Rom turned into Bezier segments), so a temperature line reads as a line, not a polygon.
function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// The next 24 hours as one chart: a smooth temperature curve (drawn in when it scrolls into view) over little rain bars, scrubbed with a
// finger or the mouse (or the arrow keys) to read any hour. All values are the real hourly forecast.
export function HourlyChart({ hourly }: { hourly: HourlyPoint[] }) {
  const tr = useTranslate();
  const reduced = useReducedMotion();
  const id = useId();
  const pts = useMemo(() => hourly.slice(0, 24), [hourly]);
  const [active, setActive] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // The chart is drawn at its real width, so its text keeps its size on a phone and on a wide screen.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setW(Math.max(300, Math.round(el.getBoundingClientRect().width)));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (pts.length < 2) return null;

  const H = 220;
  const PAD = { l: 26, r: 26, t: 34, b: 52 };
  const temps = pts.map((p) => p.tempC);
  const lo = Math.min(...temps) - 1.5;
  const hi = Math.max(...temps) + 1.5;
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (pts.length - 1);
  const y = (t: number) => PAD.t + (1 - (t - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const coords = pts.map((p, i) => ({ x: x(i), y: y(p.tempC) }));
  const line = smooth(coords);
  const area = `${line} L${coords[coords.length - 1].x} ${H - PAD.b} L${coords[0].x} ${H - PAD.b} Z`;
  const sel = active ?? 0;
  const at = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const f = (clientX - r.left) / r.width;
    const i = Math.round(((f * W - PAD.l) / (W - PAD.l - PAD.r)) * (pts.length - 1));
    setActive(Math.min(pts.length - 1, Math.max(0, i)));
  };
  const hot = temps.indexOf(Math.max(...temps));
  const cold = temps.indexOf(Math.min(...temps));
  const p = pts[sel];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-foreground">
          <WeatherIcon icon={p.icon} size={20} />
          <span className="text-xl font-semibold tabular-nums">{p.tempC}°</span>
          <span className="text-muted">
            {sel === 0 ? tr("Now") : clockOf(p.time)} · {tr("Rain")} {p.precipProbability}%
            {p.precipMm != null && p.precipMm > 0 ? ` · ${p.precipMm} mm` : ""}
          </span>
        </p>
        <p className="text-[11px] text-text-tertiary">{tr("Drag across the chart to read each hour")}</p>
      </div>
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label={tr("Hourly forecast")}
        aria-valuemin={0}
        aria-valuemax={pts.length - 1}
        aria-valuenow={sel}
        aria-valuetext={`${clockOf(p.time)}, ${p.tempC}°`}
        onPointerMove={(e: RPointerEvent) => at(e.clientX)}
        onPointerDown={(e: RPointerEvent) => at(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive(Math.min(pts.length - 1, sel + 1));
          else if (e.key === "ArrowLeft") setActive(Math.max(0, sel - 1));
          else if (e.key === "Escape") setActive(null);
        }}
        className="touch-pan-y rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
      >
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block select-none">
          <defs>
            <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffb36b" stopOpacity="0.4" />
              <stop offset="1" stopColor="#ffb36b" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffd27d" />
              <stop offset="0.5" stopColor="#ff9a7a" />
              <stop offset="1" stopColor="#b48cff" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * (H - PAD.t - PAD.b)} y2={PAD.t + f * (H - PAD.t - PAD.b)} stroke="currentColor" className="text-foreground/10" strokeDasharray="3 5" />
          ))}
          {/* rain bars */}
          {pts.map((q, i) => (
            <motion.rect
              key={q.time}
              x={x(i) - 4}
              width={8}
              rx={3}
              fill="#4DA3FF"
              opacity={0.28 + q.precipProbability / 160}
              initial={reduced ? false : { height: 0, y: H - PAD.b }}
              whileInView={{ height: (q.precipProbability / 100) * 30 + (q.precipProbability ? 2 : 0), y: H - PAD.b - ((q.precipProbability / 100) * 30 + (q.precipProbability ? 2 : 0)) }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : 0.5 + i * 0.015 }}
            />
          ))}
          <motion.path d={area} fill={`url(#${id}-a)`} initial={reduced ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.5 }} />
          <motion.path
            d={line}
            fill="none"
            stroke={`url(#${id}-l)`}
            strokeWidth={3}
            strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
          {/* the day's high and low */}
          {[hot, cold].map((i, k) => (
            <g key={k}>
              <circle cx={coords[i].x} cy={coords[i].y} r="3.5" fill="#fff" opacity="0.9" />
              <text x={coords[i].x} y={coords[i].y + (k === 0 ? -10 : 18)} textAnchor="middle" fontSize="12" fill="currentColor" className="fill-foreground/80">
                {temps[i]}°
              </text>
            </g>
          ))}
          {/* hour labels, every third */}
          {pts.map((q, i) =>
            (W < 520 ? i % 6 === 0 : i % 3 === 0) ? (
              <text key={q.time} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" className="fill-foreground/55">
                {i === 0 ? tr("Now") : clockOf(q.time)}
              </text>
            ) : null,
          )}
          {/* the scrubber */}
          <g style={{ transform: `translateX(${coords[sel].x}px)`, transition: reduced ? "none" : "transform 0.18s ease-out" }}>
            <line y1={PAD.t - 8} y2={H - PAD.b} stroke="#fff" strokeOpacity="0.35" strokeDasharray="2 3" />
          </g>
          <circle cx={coords[sel].x} cy={coords[sel].y} r="6.5" fill="#fff" stroke="#ff9a7a" strokeWidth="3" style={{ transition: reduced ? "none" : "cx 0.18s ease-out, cy 0.18s ease-out" }} />
        </svg>
      </div>
    </div>
  );
}

// The coming days as range bars on one shared temperature scale: where each day's low and high sit, the sky, and the chance of rain.
export function WeekChart({ today, forecast }: { today: { icon: WeatherIconKind; high: number; low: number; rain: number }; forecast: ForecastDay[] }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const rows = [{ key: "today", label: tr("Today"), ...today }, ...forecast.map((d) => ({ key: d.date, label: weekdayLabel(d.date, language), icon: d.icon, high: d.high, low: d.low, rain: d.precipProbability }))];
  const lo = Math.min(...rows.map((r) => r.low));
  const hi = Math.max(...rows.map((r) => r.high));
  const span = hi - lo || 1;
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((r, i) => (
        <li key={r.key} className={`grid grid-cols-[3.2rem_1.4rem_2.6rem_1fr_2.4rem] items-center gap-2 rounded-xl px-2 py-2 text-sm sm:grid-cols-[4rem_1.6rem_3rem_1fr_2.8rem] ${i === 0 ? "bg-foreground/[0.06]" : ""}`}>
          <span className="text-xs font-medium text-foreground">{r.label}</span>
          <WeatherIcon icon={r.icon} size={18} />
          <span className="text-right text-[11px] tabular-nums text-sky-400">{r.rain}%</span>
          <span className="relative h-2 rounded-full bg-foreground/10" aria-hidden="true">
            <motion.span
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-orange-400"
              style={{ left: `${((r.low - lo) / span) * 100}%` }}
              initial={reduced ? false : { width: 0 }}
              whileInView={{ width: `${Math.max(6, ((r.high - r.low) / span) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
          <span className="text-right text-xs tabular-nums text-foreground">
            {r.high}° <span className="text-muted">{r.low}°</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
