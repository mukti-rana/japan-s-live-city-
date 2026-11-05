"use client";

import { Building2, Camera, Castle, Gem, Landmark, MapPinned, Mountain, Palette, ShoppingBag, Sparkles, Ticket, Trees, Users, Utensils, type LucideIcon } from "lucide-react";
import { TOPICS } from "@/lib/explore/topics";
import { useTranslate } from "@/lib/i18n/inline";

const ICONS: Record<string, LucideIcon> = { Landmark, Castle, Trees, Utensils, ShoppingBag, Ticket, Building2, Gem, Camera, Mountain, Palette, Users, Sparkles, MapPinned };

// The discovery categories. Choosing one (or several) filters the list below
// to real places of that kind; one the open data cannot support says so.
export default function TopicGrid({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const tr = useTranslate();
  return (
    <section aria-label={tr("Discover by category")} className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground sm:text-xl">{tr("Discover by category")}</h2>
        <p className="text-xs text-muted">{tr("Pick one or more. Every category lists real places from the open data.")}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {TOPICS.map((t) => {
          const Icon = ICONS[t.icon] ?? Sparkles;
          const on = selected.includes(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={on}
                disabled={Boolean(t.unavailable)}
                title={t.unavailable ? tr(t.unavailable) : undefined}
                onClick={() => onToggle(t.id)}
                className={`flex h-full min-h-[5.5rem] w-full flex-col items-start justify-between gap-2 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:cursor-not-allowed disabled:opacity-50 ${
                  on ? "border-neon-purple/60 bg-gradient-to-br from-azure/20 to-neon-purple/25 shadow-[0_0_24px_-10px_rgba(124,92,255,0.8)]" : "border-glass-border bg-glass-bg hover:border-azure/40"
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${on ? "bg-neon-purple/30 text-[#c4b5fd]" : "bg-azure/15 text-azure"}`}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold leading-snug text-foreground">{tr(t.label)}</span>
                {t.unavailable && <span className="text-[10px] leading-tight text-muted">{tr("Not in our data yet")}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
