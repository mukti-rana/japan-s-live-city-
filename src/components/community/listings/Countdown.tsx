"use client";

import { useEffect, useState } from "react";
import Tx from "@/components/i18n/Tx";
import { countdown } from "@/lib/community/listings/time";
import { useTranslate } from "@/lib/i18n/inline";

// "Starts in 3 days 4 hours", kept right while the page is open. Nothing is shown once it has started.
export default function Countdown({ startMs }: { startMs: number }) {
  const tr = useTranslate();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  const left = now === null ? null : countdown(startMs, now);
  if (!left) return null;
  const parts = [left.days > 0 ? `${left.days} ${tr(left.days === 1 ? "day" : "days")}` : "", left.days < 3 ? `${left.hours} ${tr(left.hours === 1 ? "hour" : "hours")}` : "", left.days === 0 ? `${left.minutes} ${tr("min")}` : ""].filter(Boolean);
  return (
    <p className="text-sm font-medium text-[#ffcf7a]">
      <Tx en="Starts in" /> {parts.join(" ")}
    </p>
  );
}
