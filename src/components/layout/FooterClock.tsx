"use client";

import { useEffect, useState } from "react";

export default function FooterClock({ timeZone }: { timeZone: string }) {
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

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(now);

  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
      <span className="tabular-nums text-foreground/80" suppressHydrationWarning>
        {time}
      </span>
      <span suppressHydrationWarning>{date}</span>
    </span>
  );
}
