"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

function greetingKeyFor(hour: number): TranslationKey {
  if (hour < 5) return "hero.goodNight";
  if (hour < 12) return "hero.goodMorning";
  if (hour < 17) return "hero.goodAfternoon";
  return "hero.goodEvening";
}

export default function LiveClock({
  timeZone,
  children,
}: {
  timeZone: string;
  children?: ReactNode;
}) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const time = parts
    .filter((p) => ["hour", "minute", "second", "literal"].includes(p.type))
    .map((p) => p.value)
    .join("");

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
    weekday: "short",
  }).format(now);

  const [weekday, ...rest] = date.split(", ");
  const dateLabel = `${rest.join(", ")} (${weekday})`;

  return (
    <div>
      <p className="text-sm font-medium text-foreground/80" suppressHydrationWarning>
        {t(greetingKeyFor(hour))}
      </p>
      {children}
      <p className="mt-3 text-xs text-foreground/70" suppressHydrationWarning>
        {dateLabel}
      </p>
      <p
        className="mt-0.5 text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl"
        suppressHydrationWarning
      >
        {time}
      </p>
    </div>
  );
}
