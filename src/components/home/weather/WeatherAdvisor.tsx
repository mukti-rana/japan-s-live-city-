"use client";

import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Footprints, Shirt, Snowflake, Sparkles, Sun, Umbrella } from "lucide-react";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import { buildAdvice } from "@/lib/weather/advice";
import type { HourlyPoint, WeatherSnapshot } from "@/lib/services/weather";
import { useTranslate } from "@/lib/i18n/inline";

// Each kind of advice has its own quiet colour (lavender for clothing, cyan for rain, amber for sun, green for being outside, ice
// blue for the cold). The colour is not fixed: it shifts and strengthens with the real conditions (a deeper cyan in heavy rain, a
// richer amber at a high UV, a bluer lavender when it is cold, a cooler green when going out is not advised), and fades smoothly when
// the reading changes. The colours are set as numbers (see .wx-card in globals.css) so the browser can animate them.
type Accent = { rgb: number[]; strength: number };

// A number that counts up to its value each time its card comes into view, and to its new value when the reading changes (and just
// shows it for visitors who ask for less motion).
function Figure({ value, suffix, live }: { value: number; suffix?: string; live: boolean }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const shown = useTransform(mv, (v) => String(Math.round(v)));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    if (!live) {
      mv.set(0);
      return;
    }
    const run = animate(mv, value, { duration: 1.3, ease: [0.22, 1, 0.36, 1] });
    return () => run.stop();
  }, [value, live, reduce, mv]);
  return (
    <span className="tabular-nums">
      <motion.span>{shown}</motion.span>
      {suffix && <span className="ml-0.5 text-[0.5em] font-medium opacity-80">{suffix}</span>}
    </span>
  );
}

// ── The little pictures: each card draws the real numbers behind its advice, so the card can be read at a glance. They grow in when the
// card comes into view (CSS keyed to the card's data-live, see .wx-viz in globals.css) and show finished under reduced motion. Each is
// decoration over text that already says the same thing, so it is a labelled image, not extra content. ──
const pct = (v: number, lo: number, hi: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
const UV_COLOURS = ["#6ee7a0", "#8ae88a", "#b6e876", "#e0e060", "#f1c94f", "#f5a845", "#f58a3f", "#f0663d", "#e8484f", "#c94fb0", "#9a5fe0"];

// The day's range of temperature on a scale from -5° to 35°, with where it feels like right now.
function TempScale({ feels, low, high, label }: { feels: number; low: number; high: number; label: string }) {
  const tr = useTranslate();
  return (
    <div className="wx-viz" role="img" aria-label={label}>
      <div className="wx-scale">
        <span className="wx-scale__band" style={{ left: `${pct(low, -5, 35)}%`, width: `${Math.max(2, pct(high, -5, 35) - pct(low, -5, 35))}%` }} />
        <span className="wx-scale__dot" style={{ "--p": pct(feels, -5, 35) / 100 } as CSSProperties} />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/60">
        <span>
          {tr("Low")} {low}°
        </span>
        <span>
          {tr("High")} {high}°
        </span>
      </div>
    </div>
  );
}

// The chance of rain in each of the next 12 hours, as bars.
function RainBars({ hours, label }: { hours: HourlyPoint[]; label: string }) {
  const tr = useTranslate();
  if (hours.length === 0) return null;
  return (
    <div className="wx-viz" role="img" aria-label={label}>
      <div className="wx-bars">
        {hours.map((h, i) => (
          <span key={h.time} className="wx-bar" style={{ "--i": i, "--h": `${Math.max(7, h.precipProbability)}%`, "--a": 0.35 + (h.precipProbability / 100) * 0.65 } as CSSProperties} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/60">
        <span>{tr("Now")}</span>
        <span className="tabular-nums">{hours[hours.length - 1].time.slice(11, 16)}</span>
      </div>
    </div>
  );
}

// The day's peak UV on the usual 1 to 11+ scale, lit up to the figure.
function UvMeter({ uv, dim, label }: { uv: number; dim: boolean; label: string }) {
  const tr = useTranslate();
  const lit = Math.min(11, Math.round(uv));
  return (
    <div className={`wx-viz ${dim ? "opacity-60" : ""}`} role="img" aria-label={label}>
      <div className="wx-uv">
        {UV_COLOURS.map((c, i) => (
          <span key={c} className="wx-uv__cell" data-lit={i < lit ? "true" : "false"} style={{ "--i": i, "--c": c } as CSSProperties} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/60">
        <span>{tr("Peak UV today")}</span>
        <span className="tabular-nums">{uv}</span>
      </div>
    </div>
  );
}

// Each of the next 12 hours: dry (green) or wet (blue), judged the same way as the advice itself.
function DryStrip({ hours, label }: { hours: HourlyPoint[]; label: string }) {
  const tr = useTranslate();
  if (hours.length === 0) return null;
  return (
    <div className="wx-viz" role="img" aria-label={label}>
      <div className="wx-dry">
        {hours.map((h, i) => (
          <span key={h.time} className="wx-dry__cell" data-wet={h.precipProbability >= 40 || (h.precipMm ?? 0) >= 0.5 ? "true" : "false"} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/60">
        <span>{tr("Now")}</span>
        <span className="tabular-nums">{hours[hours.length - 1].time.slice(11, 16)}</span>
      </div>
    </div>
  );
}

// The air against how it feels, two bars on one scale (-10° to 20°): the gap is the wind's bite.
function ChillBars({ air, feels, label }: { air: number; feels: number; label: string }) {
  const tr = useTranslate();
  const rows = [
    { name: tr("Air"), v: air, tone: "air" },
    { name: tr("Feels like"), v: feels, tone: "feels" },
  ];
  return (
    <div className="wx-viz flex flex-col gap-2" role="img" aria-label={label}>
      {rows.map((r, i) => (
        <div key={r.tone} className="flex items-center gap-3 text-[11px] text-foreground/70">
          <span className="w-[5.5rem] shrink-0 font-medium uppercase tracking-[0.1em]">{r.name}</span>
          <span className="wx-chill"><span className="wx-chill__bar" data-tone={r.tone} style={{ "--w": `${Math.max(3, pct(r.v, -10, 20))}%`, "--i": i } as CSSProperties} /></span>
          <span className="w-9 shrink-0 text-right font-semibold tabular-nums text-foreground/90">{r.v}°</span>
        </div>
      ))}
    </div>
  );
}

// One piece of advice: a coloured icon and heading, the advice itself in a large clear line, the real figure that matters most
// (large, on the right), a few chips for the concrete things to bring or do, and the real figures behind it in small print.
function Card({ accent, icon, title, headline, figure, items, details, wide, viz }: { accent: Accent; icon: ReactNode; title: string; headline: string; figure?: { label: string; value: number; suffix?: string }; items: string[]; details: string[]; wide?: boolean; viz?: ReactNode }) {
  const style = { "--acc-r": accent.rgb[0], "--acc-g": accent.rgb[1], "--acc-b": accent.rgb[2], "--acc-s": accent.strength } as CSSProperties;
  const ref = useRef<HTMLDivElement>(null);
  // The card knows when it is on screen (so its figure and picture play each time it comes into view) and where the pointer is (a soft
  // light of the card's own colour follows it). Until the browser has mounted, no state is claimed and everything shows finished.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const live = useInView(ref, { amount: 0.4 });
  const follow = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} style={style} onPointerMove={follow} data-live={mounted ? String(live) : undefined} className={`wx-card flex min-w-0 flex-col gap-3 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="wx-title flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]">
          <span className="wx-chip-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">{icon}</span>
          {title}
        </p>
        {figure && (
          <div className="shrink-0 text-right">
            <p className="wx-title wx-figure text-[2rem] font-semibold leading-none tracking-tight sm:text-[2.35rem]">
              <Figure value={figure.value} suffix={figure.suffix} live={!mounted || live} />
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/65">{figure.label}</p>
          </div>
        )}
      </div>
      {/* When the advice changes it settles in rather than jumping. */}
      <motion.p key={headline} initial={{ opacity: 0, y: 6, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="text-[1.1rem] font-semibold leading-snug tracking-tight text-foreground sm:text-[1.2rem]">
        {headline}
      </motion.p>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li key={i} className="wx-chip rounded-full px-2.5 py-1 text-[12px]">
              {i}
            </li>
          ))}
        </ul>
      )}
      {viz && <div className="mt-1">{viz}</div>}
      <div className="mt-auto flex flex-col gap-1 pt-0.5">
        {details.map((d) => (
          <p key={d} className="text-[13px] leading-relaxed text-foreground/72">
            {d}
          </p>
        ))}
      </div>
    </div>
  );
}

// "What should I prepare before going out?" — what to wear, whether to take an umbrella, sun protection and whether it is a
// good time to be outside, all worked out from the live forecast on the page, with the day's advice in one line up front.
// It recalculates whenever the weather reading refreshes. Every figure is the real reading; none is invented.
export default function WeatherAdvisor({ weather, isNight, uvLabel }: { weather: WeatherSnapshot; isNight: boolean; uvLabel: string }) {
  const tr = useTranslate();
  const a = buildAdvice(weather, isNight);

  const wearDetails = [tr("Based on a feels-like of {t}°C.").replace("{t}", String(a.wear.feelsLikeC))];
  if (a.wear.cooling) wearDetails.push(tr("It will cool to {t}°C by {time} — bring an extra layer.").replace("{t}", String(a.wear.cooling.tempC)).replace("{time}", a.wear.cooling.at));
  else if (a.wear.swing) wearDetails.push(tr("Big swing today ({low}–{high}°C) — dress in layers you can take off.").replace("{low}", String(a.wear.swing.low)).replace("{high}", String(a.wear.swing.high)));

  const u = a.umbrella;
  const rainDetails: string[] = [];
  if (u.level === "none") rainDetails.push(tr("No meaningful rain expected in the next 12 hours (highest chance {p}%).").replace("{p}", String(u.peakProb)));
  else {
    rainDetails.push(tr("Rain likely {from}–{to}, up to {p}% chance.").replace("{from}", u.from ?? "").replace("{to}", u.to ?? "").replace("{p}", String(u.peakProb)));
    if (u.totalMm !== null) rainDetails.push(tr("About {mm} mm expected over the next 12 hours.").replace("{mm}", String(u.totalMm)));
    if (u.windy) rainDetails.push(tr("Strong wind ({w} km/h) makes an umbrella hard to use.").replace("{w}", String(u.windKmh)));
  }

  const s = a.sun;
  const sunDetails = [
    s.level === "night"
      ? tr("It's dark now — UV picks up after sunrise ({t}).").replace("{t}", s.sunrise)
      : tr("UV index {n} ({level}) at its peak today.").replace("{n}", String(s.uv)).replace("{level}", uvLabel),
  ];

  const o = a.outdoor;
  const outdoorDetails: string[] = [];
  if (o.dryHours === null) outdoorDetails.push(tr("Dry for the next {n} hours.").replace("{n}", String(o.hoursChecked)));
  else {
    if (o.dryHours > 0) outdoorDetails.push(tr("Dry for the next {n} hours.").replace("{n}", String(o.dryHours)));
    if (o.rainFrom) outdoorDetails.push(tr("Rain expected from about {time}.").replace("{time}", o.rainFrom));
  }
  outdoorDetails.push(tr("Feels like {t}°C with {w} km/h wind.").replace("{t}", String(o.feelsLikeC)).replace("{w}", String(o.windKmh)));
  if (o.visibilityKm !== null) outdoorDetails.push(tr("Visibility is only {v} km.").replace("{v}", String(o.visibilityKm)));

  // The colours, from the real conditions.
  const wearAccent: Accent = ({ freezing: { rgb: [150, 170, 255], strength: 0.95 }, cold: { rgb: [160, 172, 255], strength: 0.9 }, cool: { rgb: [170, 165, 255], strength: 0.85 }, mild: { rgb: [176, 160, 255], strength: 0.8 }, comfortable: { rgb: [180, 160, 252], strength: 0.75 }, warm: { rgb: [196, 160, 250], strength: 0.8 }, hot: { rgb: [214, 158, 244], strength: 0.85 } } as Record<string, Accent>)[a.wear.band];
  const umbrellaAccent: Accent = ({ none: { rgb: [96, 186, 214], strength: 0.5 }, umbrella: { rgb: [80, 196, 230], strength: 0.8 }, raincoat: { rgb: [70, 186, 230], strength: 0.95 }, heavy: { rgb: [64, 170, 228], strength: 1 } } as Record<string, Accent>)[u.level];
  const sunAccent: Accent = ({ night: { rgb: [190, 168, 130], strength: 0.35 }, low: { rgb: [226, 184, 100], strength: 0.55 }, moderate: { rgb: [238, 178, 82], strength: 0.75 }, high: { rgb: [242, 164, 70], strength: 0.95 }, veryHigh: { rgb: [244, 146, 64], strength: 1 } } as Record<string, Accent>)[s.level];
  const outdoorAccent: Accent = ({ great: { rgb: [118, 204, 152], strength: 1 }, good: { rgb: [128, 200, 150], strength: 0.85 }, caution: { rgb: [196, 194, 112], strength: 0.8 }, indoor: { rgb: [140, 162, 178], strength: 0.7 } } as Record<string, Accent>)[o.level];

  // The cold-weather card appears only when it is really cold (feels-like of 7°C or below), from the same figures.
  const cold = a.wear.band === "freezing" || a.wear.band === "cold";
  const coldAccent: Accent = { rgb: [150, 204, 244], strength: a.wear.band === "freezing" ? 1 : 0.8 };
  const coldDetails = [tr("Feels like {t}°C, with the air at {a}°C.").replace("{t}", String(a.wear.feelsLikeC)).replace("{a}", String(Math.round(weather.tempC)))];
  if (weather.windKmh >= 20 && a.wear.feelsLikeC < weather.tempC) coldDetails.push(tr("Wind of {w} km/h makes it feel colder.").replace("{w}", String(Math.round(weather.windKmh))));
  const coldItems = [tr("Gloves"), tr("Scarf"), tr("Warm drink")];
  if (a.wear.band === "freezing") coldItems.push(tr("Watch for icy ground"));

  // One short line: the headlines that matter, leaving out sun when none is needed.
  const parts = [tr(a.wear.headline), tr(a.umbrella.headline)];
  if (s.level !== "low" && s.level !== "night") parts.push(tr(s.headline));

  return (
    <section aria-label={tr("Weather Advisor")} className="flex h-full min-w-0 flex-col gap-5">
      <div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
          <span className="flex items-center gap-2">
            <Sparkles size={13} aria-hidden="true" className="text-[#c4b5fd]" />
            {tr("Today's advice")}
          </span>
          {/\d\d:\d\d/.test(weather.updatedAt.slice(11, 16)) && (
            <span className="flex items-center gap-1.5 font-medium normal-case tracking-normal text-foreground/60">
              <span aria-hidden="true" className="wx-live h-1.5 w-1.5 rounded-full bg-[#7ee0a8]" />
              {tr("Updated")} {weather.updatedAt.slice(11, 16)} JST
            </span>
          )}
        </p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.9rem]">{tr("Weather Advisor")}</h3>
        <p className="mt-1.5 text-sm text-foreground/72">{tr("What should I prepare before going out?")}</p>
      </div>

      {/* The day in one line, large and in the page's serif, over a rule in the colour of what to wear. */}
      <div style={{ "--acc-r": wearAccent.rgb[0], "--acc-g": wearAccent.rgb[1], "--acc-b": wearAccent.rgb[2], "--acc-s": wearAccent.strength } as CSSProperties}>
        <motion.p key={parts.join("|")} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="font-[family-name:var(--font-home-serif)] text-[clamp(1.4rem,2.2vw,2rem)] leading-[1.25] tracking-[-0.01em] text-foreground">
          {parts.join(". ")}.
        </motion.p>
        <span aria-hidden="true" className="wx-rule mt-4 block" />
      </div>

      <ScrollReveal from="stagger">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Card accent={wearAccent} icon={<Shirt size={18} aria-hidden="true" />} title={tr("What to wear")} headline={tr(a.wear.headline)} figure={{ label: tr("Feels like"), value: a.wear.feelsLikeC, suffix: "°" }} items={a.wear.items.map((i) => tr(i))} details={wearDetails} viz={<TempScale feels={a.wear.feelsLikeC} low={weather.todayLow} high={weather.todayHigh} label={tr("Temperature today: where it feels like now, between the low and the high")} />} />
          <Card accent={umbrellaAccent} icon={<Umbrella size={18} aria-hidden="true" />} title={tr("Umbrella advice")} headline={tr(a.umbrella.headline)} figure={{ label: tr("Rain chance"), value: u.peakProb, suffix: "%" }} items={[]} details={rainDetails} viz={<RainBars hours={weather.hourly.slice(0, 12)} label={tr("Chance of rain in each of the next 12 hours")} />} />
          <Card accent={sunAccent} icon={<Sun size={18} aria-hidden="true" />} title={tr("Sun protection")} headline={tr(s.headline)} figure={s.level === "night" ? undefined : { label: tr("UV index"), value: s.uv }} items={s.items.map((i) => tr(i))} details={sunDetails} viz={<UvMeter uv={s.uv} dim={s.level === "night"} label={tr("UV index at its peak today, on a scale from 1 to 11")} />} />
          <Card accent={outdoorAccent} icon={<Footprints size={18} aria-hidden="true" />} title={tr("Outdoor activities")} headline={tr(o.headline)} figure={{ label: tr("Dry hours"), value: o.dryHours ?? o.hoursChecked, suffix: "h" }} items={o.items.map((i) => tr(i))} details={outdoorDetails} viz={<DryStrip hours={weather.hourly.slice(0, 12)} label={tr("Dry and wet hours over the next 12 hours")} />} />
          {cold && <Card wide accent={coldAccent} icon={<Snowflake size={18} aria-hidden="true" />} title={tr("Cold weather")} headline={tr(a.wear.band === "freezing" ? "Freezing — cover up and mind the ice" : "Cold — keep your hands and neck warm")} figure={{ label: tr("Lowest today"), value: weather.todayLow, suffix: "°" }} items={coldItems} details={coldDetails} viz={<ChillBars air={Math.round(weather.tempC)} feels={a.wear.feelsLikeC} label={tr("Air temperature compared with how it feels")} />} />}
        </div>
      </ScrollReveal>
    </section>
  );
}
