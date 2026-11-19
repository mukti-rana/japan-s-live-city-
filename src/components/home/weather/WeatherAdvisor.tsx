"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Footprints, Shirt, Snowflake, Sparkles, Sun, Umbrella } from "lucide-react";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import { buildAdvice } from "@/lib/weather/advice";
import type { WeatherSnapshot } from "@/lib/services/weather";
import { useTranslate } from "@/lib/i18n/inline";

// Each kind of advice has its own quiet colour (lavender for clothing, cyan for rain, amber for sun, green for being outside, ice
// blue for the cold). The colour is not fixed: it shifts and strengthens with the real conditions (a deeper cyan in heavy rain, a
// richer amber at a high UV, a bluer lavender when it is cold, a cooler green when going out is not advised), and fades smoothly when
// the reading changes. The colours are set as numbers (see .wx-card in globals.css) so the browser can animate them.
type Accent = { rgb: number[]; strength: number };

// A number that counts to its new value when the reading changes (and just shows it for visitors who ask for less motion).
function Figure({ value, suffix }: { value: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const shown = useTransform(mv, (v) => String(Math.round(v)));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const run = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => run.stop();
  }, [value, reduce, mv]);
  return (
    <span className="tabular-nums">
      <motion.span>{shown}</motion.span>
      {suffix && <span className="ml-0.5 text-[0.5em] font-medium opacity-80">{suffix}</span>}
    </span>
  );
}

// One piece of advice: a coloured icon and heading, the advice itself in a large clear line, the real figure that matters most
// (large, on the right), a few chips for the concrete things to bring or do, and the real figures behind it in small print.
function Card({ accent, icon, title, headline, figure, items, details, wide }: { accent: Accent; icon: ReactNode; title: string; headline: string; figure?: { label: string; value: number; suffix?: string }; items: string[]; details: string[]; wide?: boolean }) {
  const style = { "--acc-r": accent.rgb[0], "--acc-g": accent.rgb[1], "--acc-b": accent.rgb[2], "--acc-s": accent.strength } as CSSProperties;
  return (
    <div style={style} className={`wx-card flex min-w-0 flex-col gap-3 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="wx-title flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]">
          <span className="wx-chip-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">{icon}</span>
          {title}
        </p>
        {figure && (
          <div className="shrink-0 text-right">
            <p className="wx-title text-[2rem] font-semibold leading-none tracking-tight sm:text-[2.35rem]">
              <Figure value={figure.value} suffix={figure.suffix} />
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
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
          <Sparkles size={13} aria-hidden="true" className="text-[#c4b5fd]" />
          {tr("Today's advice")}
        </p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.9rem]">{tr("Weather Advisor")}</h3>
        <p className="mt-1.5 text-sm text-foreground/72">{tr("What should I prepare before going out?")}</p>
      </div>

      <motion.p key={parts.join("|")} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="border-l-2 border-white/25 pl-4 text-base leading-relaxed text-foreground sm:text-[1.075rem]">
        {parts.join(". ")}.
      </motion.p>

      <ScrollReveal from="stagger">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Card accent={wearAccent} icon={<Shirt size={18} aria-hidden="true" />} title={tr("What to wear")} headline={tr(a.wear.headline)} figure={{ label: tr("Feels like"), value: a.wear.feelsLikeC, suffix: "°" }} items={a.wear.items.map((i) => tr(i))} details={wearDetails} />
          <Card accent={umbrellaAccent} icon={<Umbrella size={18} aria-hidden="true" />} title={tr("Umbrella advice")} headline={tr(a.umbrella.headline)} figure={{ label: tr("Rain chance"), value: u.peakProb, suffix: "%" }} items={[]} details={rainDetails} />
          <Card accent={sunAccent} icon={<Sun size={18} aria-hidden="true" />} title={tr("Sun protection")} headline={tr(s.headline)} figure={s.level === "night" ? undefined : { label: tr("UV index"), value: s.uv }} items={s.items.map((i) => tr(i))} details={sunDetails} />
          <Card accent={outdoorAccent} icon={<Footprints size={18} aria-hidden="true" />} title={tr("Outdoor activities")} headline={tr(o.headline)} figure={{ label: tr("Dry hours"), value: o.dryHours ?? o.hoursChecked, suffix: "h" }} items={o.items.map((i) => tr(i))} details={outdoorDetails} />
          {cold && <Card wide accent={coldAccent} icon={<Snowflake size={18} aria-hidden="true" />} title={tr("Cold weather")} headline={tr(a.wear.band === "freezing" ? "Freezing — cover up and mind the ice" : "Cold — keep your hands and neck warm")} figure={{ label: tr("Lowest today"), value: weather.todayLow, suffix: "°" }} items={coldItems} details={coldDetails} />}
        </div>
      </ScrollReveal>
    </section>
  );
}
