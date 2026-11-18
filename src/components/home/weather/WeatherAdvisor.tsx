"use client";

import type { ReactNode } from "react";
import { Footprints, Shirt, Sparkles, Sun, Umbrella } from "lucide-react";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import { buildAdvice } from "@/lib/weather/advice";
import type { WeatherSnapshot } from "@/lib/services/weather";
import { useTranslate } from "@/lib/i18n/inline";

// One piece of advice: a quiet monochrome icon, what it is about, the advice itself in a clear line, a few chips for the
// concrete things to bring or do, and the real figures behind it in small print.
function Card({ icon, title, headline, items, details }: { icon: ReactNode; title: string; headline: string; items: string[]; details: string[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-glass-border bg-glass-bg p-4 transition-colors duration-300 hover:border-foreground/25 hover:bg-glass-bg-strong">
      <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.07] text-foreground">{icon}</span>
        {title}
      </p>
      <p className="text-[15px] font-semibold leading-snug text-foreground">{headline}</p>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li key={i} className="rounded-full border border-glass-border px-2.5 py-1 text-[11px] text-foreground/85">
              {i}
            </li>
          ))}
        </ul>
      )}
      {details.map((d) => (
        <p key={d} className="text-xs leading-relaxed text-muted">
          {d}
        </p>
      ))}
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

  // One short line: the headlines that matter, leaving out sun when none is needed.
  const parts = [tr(a.wear.headline), tr(a.umbrella.headline)];
  if (s.level !== "low" && s.level !== "night") parts.push(tr(s.headline));

  return (
    <section aria-label={tr("Weather Advisor")} className="flex h-full min-w-0 flex-col gap-4">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          <Sparkles size={13} aria-hidden="true" />
          {tr("Today's advice")}
        </p>
        <h3 className="mt-2 text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">{tr("Weather Advisor")}</h3>
        <p className="mt-1 text-sm text-foreground/70">{tr("What should I prepare before going out?")}</p>
      </div>

      <p className="border-l-2 border-foreground/30 pl-3.5 text-sm leading-relaxed text-foreground">{parts.join(". ")}.</p>

      <ScrollReveal from="stagger">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card icon={<Shirt size={16} aria-hidden="true" />} title={tr("What to wear")} headline={tr(a.wear.headline)} items={a.wear.items.map((i) => tr(i))} details={wearDetails} />
          <Card icon={<Umbrella size={16} aria-hidden="true" />} title={tr("Umbrella advice")} headline={tr(a.umbrella.headline)} items={[]} details={rainDetails} />
          <Card icon={<Sun size={16} aria-hidden="true" />} title={tr("Sun protection")} headline={tr(s.headline)} items={s.items.map((i) => tr(i))} details={sunDetails} />
          <Card icon={<Footprints size={16} aria-hidden="true" />} title={tr("Outdoor activities")} headline={tr(o.headline)} items={o.items.map((i) => tr(i))} details={outdoorDetails} />
        </div>
      </ScrollReveal>
    </section>
  );
}
