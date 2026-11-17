"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { dateFormatter } from "@/lib/i18n/datetime";

export default function FooterClock({ timeZone }: { timeZone: string }) {
  const { language } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  const date = dateFormatter(language, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(now);

  return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums text-foreground/80" suppressHydrationWarning>
        {time}
      </span>
      <span suppressHydrationWarning>{date}</span>
    </span>
  );
}
