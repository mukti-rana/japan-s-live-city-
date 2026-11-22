"use client";

import { useEffect, useState } from "react";

// The time in Japan, kept current ("Tue 22:41"). Empty until the page is running, so what the server drew never differs from the browser's.
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export default function LiveClock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  if (now === null) return <span className={className} aria-hidden="true">&nbsp;</span>;
  const parts = fmt.formatToParts(now);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return (
    <time className={`tabular-nums ${className}`} dateTime={new Date(now).toISOString()}>
      {g("weekday")} {g("hour")}:{g("minute")} <span className="opacity-60">JST</span>
    </time>
  );
}
