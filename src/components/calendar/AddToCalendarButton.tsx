"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Check } from "lucide-react";
import { useCalendar } from "@/lib/calendar/store";
import { C } from "@/lib/calendar/strings";
import type { EventView } from "@/lib/events/query";
import { useInline } from "@/lib/i18n/inline";

// One step from the Events page into the calendar. The event's title, dates,
// venue and link are copied exactly; nothing is changed or guessed.
export default function AddToCalendarButton({ event, compact = false }: { event: EventView; compact?: boolean }) {
  const t = useInline(C);
  const cal = useCalendar();
  const [message, setMessage] = useState<string | null>(null);
  const already = cal.items.some((i) => i.linkedEvent?.id === event.id);

  function add() {
    const result = cal.addFromEvent(event);
    setMessage(result === "added" ? t("addedToCalendar") : result === "exists" ? t("alreadyAdded") : t("addFailed"));
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={add}
        disabled={already}
        aria-label={`${already ? t("alreadyAdded") : t("addToCalendar")}: ${event.title}`}
        className={`inline-flex items-center gap-1.5 rounded-full border font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${compact ? "min-h-8 px-2.5 text-[11px]" : "min-h-10 px-4 text-sm"} ${already ? "border-mint/40 bg-mint/10 text-mint" : "border-neon-purple/50 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20"}`}
      >
        {already ? <Check size={compact ? 12 : 14} aria-hidden="true" /> : <CalendarPlus size={compact ? 12 : 14} aria-hidden="true" />}
        {already ? t("alreadyAdded") : t("addToCalendar")}
      </button>
      {message && (
        <span role="status" className="text-[11px] text-muted">
          {message}{" "}
          <Link href="/calendar" className="font-semibold text-azure hover:underline">
            {t("viewInCalendar")}
          </Link>
        </span>
      )}
    </span>
  );
}
