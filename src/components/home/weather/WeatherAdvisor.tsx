"use client";

import { Shirt, Sun, Umbrella, Sparkles } from "lucide-react";
import { buildAdvice } from "@/lib/weather/advice";
import type { WeatherSnapshot } from "@/lib/services/weather";
import { useTranslate } from "@/lib/i18n/inline";

function Card({ icon, title, headline, items, details, tone }: { icon: React.ReactNode; title: string; headline: string; items: string[]; details: string[]; tone: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-glass-border bg-glass-bg p-3.5 transition-colors hover:border-azure/30">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
        {title}
      </p>
      <p className="text-sm font-semibold leading-snug text-foreground">{headline}</p>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li key={i} className="rounded-full bg-glass-bg-strong px-2.5 py-1 text-[11px] text-foreground/85">
              {i}
            </li>
          ))}
        </ul>
      )}
      {details.map((d) => (
        <p key={d} className="text-[11px] leading-relaxed text-muted">
          {d}
        </p>
      ))}
    </div>
  );
}

// "What should I prepare before going out?" — clothing, umbrella and sun
// advice worked out from the live forecast above it, and one line that sums
// it up. It recalculates whenever the weather reading refreshes.
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

  // One short line: the three headlines, leaving out sun when none is needed.
  const parts = [tr(a.wear.headline), tr(a.umbrella.headline)];
  if (s.level !== "low" && s.level !== "night") parts.push(tr(s.headline));

  return (
    <section aria-label={tr("Weather Advisor")} className="flex flex-col gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/90">
          <Sparkles size={14} className="text-[#c4b5fd]" aria-hidden="true" />
          {tr("Weather Advisor")}
        </h3>
        <p className="mt-0.5 text-sm text-foreground/75">{tr("What should I prepare before going out?")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card icon={<Shirt size={14} aria-hidden="true" />} tone="bg-azure/15 text-azure" title={tr("What to wear")} headline={tr(a.wear.headline)} items={a.wear.items.map((i) => tr(i))} details={wearDetails} />
        <Card icon={<Umbrella size={14} aria-hidden="true" />} tone="bg-neon-purple/15 text-[#c4b5fd]" title={tr("Umbrella advice")} headline={tr(a.umbrella.headline)} items={[]} details={rainDetails} />
        <Card icon={<Sun size={14} aria-hidden="true" />} tone="bg-gold/15 text-gold" title={tr("Sun protection")} headline={tr(s.headline)} items={s.items.map((i) => tr(i))} details={sunDetails} />
      </div>
      <p className="rounded-2xl border border-azure/25 bg-gradient-to-r from-azure/10 to-neon-purple/10 px-4 py-3 text-sm leading-relaxed text-foreground">
        <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-[#c4b5fd]">{tr("Today's advice")}</span>
        {parts.join(". ")}.
      </p>
    </section>
  );
}
