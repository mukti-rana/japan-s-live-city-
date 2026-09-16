"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import Thumb from "@/components/ui/Thumb";
import type { EnrichedFestival } from "@/lib/services/events";
import type { EventCategory } from "@/lib/data/events";

const CATEGORY_TABS: ("All" | EventCategory)[] = ["All", "Festival", "Fireworks"];

export default function EventsGrid({
  festivals,
  limit,
}: {
  festivals: EnrichedFestival[];
  limit?: number;
}) {
  const [category, setCategory] = useState<"All" | EventCategory>("All");

  const filtered = festivals.filter(
    (f) => category === "All" || f.category === category,
  );
  const visible = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        tabs={CATEGORY_TABS}
        value={category}
        onChange={(t) => setCategory(t as "All" | EventCategory)}
      />

      <ul className="flex flex-col">
        {visible.map((festival) => (
          <li
            key={festival.name}
            className="flex gap-3 border-b border-glass-border py-2.5 last:border-0"
          >
            <a
              href={festival.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Thumb
                gradient={festival.gradient}
                icon={CalendarDays}
                src={festival.image}
                alt={festival.name}
                className="h-14 w-16"
              />
            </a>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <a
                  href={festival.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 text-xs font-medium leading-snug text-foreground hover:text-azure"
                >
                  {festival.name}
                </a>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
                    festival.occurrence.status === "ongoing"
                      ? "bg-mint/15 text-mint"
                      : "bg-sakura/15 text-sakura"
                  }`}
                >
                  {festival.occurrence.status === "ongoing"
                    ? "Ongoing"
                    : festival.occurrence.daysUntil === 1
                      ? "Tomorrow"
                      : `In ${festival.occurrence.daysUntil}d`}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted">
                {festival.city} <span className="text-glass-border">|</span>{" "}
                {festival.dateLabel}
              </p>
              <p className="mt-1 truncate text-[10px] text-muted">
                {festival.description ?? festival.category}
              </p>
            </div>
          </li>
        ))}

        {visible.length === 0 && (
          <p className="py-4 text-center text-xs text-muted">
            No {category.toLowerCase()} events found.
          </p>
        )}
      </ul>
    </div>
  );
}
