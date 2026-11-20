"use client";

import { Building2, Camera, Castle, Check, Gem, Landmark, MapPinned, Mountain, Palette, ShoppingBag, Sparkles, Ticket, Trees, Users, Utensils, type LucideIcon } from "lucide-react";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import { TOPICS } from "@/lib/explore/topics";
import { useTranslate } from "@/lib/i18n/inline";

const ICONS: Record<string, LucideIcon> = { Landmark, Castle, Trees, Utensils, ShoppingBag, Ticket, Building2, Gem, Camera, Mountain, Palette, Users, Sparkles, MapPinned };

// Each kind of place has its own quiet colour (r, g, b), so the tiles read as a set of different things, not 14 identical boxes.
const TINT: Record<string, [number, number, number]> = {
  temples: [244, 150, 180],
  history: [235, 180, 110],
  nature: [110, 205, 150],
  food: [250, 150, 110],
  shopping: [190, 160, 250],
  entertainment: [250, 130, 170],
  views: [120, 190, 250],
  hidden: [196, 181, 253],
  photo: [250, 210, 120],
  outdoors: [100, 200, 220],
  museums: [160, 175, 255],
  family: [150, 220, 160],
  unique: [255, 160, 130],
  local: [180, 200, 230],
};

// The discovery categories. Choosing one (or several) filters the list below to real places of that kind; one the open data cannot
// support says so. Large tiles with a tinted glow, a big icon and a small lift on hover, set in two calm rows.
export default function TopicGrid({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const tr = useTranslate();
  return (
    <section aria-label={tr("Discover by category")} className="flex flex-col gap-4">
      <ScrollReveal>
        <h2 className="font-[family-name:var(--font-home-serif)] text-[clamp(26px,3.2vw,40px)] font-normal leading-tight tracking-[-0.015em] text-foreground">{tr("Discover by category")}</h2>
        <p className="mt-1 text-sm text-muted">{tr("Pick one or more. Every category lists real places from the open data.")}</p>
      </ScrollReveal>
      <ScrollReveal from="stagger">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {TOPICS.map((t) => {
            const Icon = ICONS[t.icon] ?? Sparkles;
            const on = selected.includes(t.id);
            const [r, g, b] = TINT[t.id] ?? [190, 200, 255];
            const rgb = `${r},${g},${b}`;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={Boolean(t.unavailable)}
                  title={t.unavailable ? tr(t.unavailable) : undefined}
                  onClick={() => onToggle(t.id)}
                  style={{ "--tc": rgb, background: `radial-gradient(120% 90% at 0% 0%, rgba(${rgb},${on ? 0.32 : 0.16}), transparent 65%), var(--surface-1, #0b0c11)`, borderColor: on ? `rgba(${rgb},0.8)` : `rgba(${rgb},0.22)`, boxShadow: on ? `0 0 0 1px rgba(${rgb},0.5), 0 18px 40px -20px rgba(${rgb},0.8)` : undefined } as React.CSSProperties}
                  className="group/t relative flex h-full min-h-[8.5rem] w-full flex-col justify-between gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_18px_36px_-22px_rgba(var(--tc),0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 motion-reduce:transition-none"
                >
                  <span className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-500 group-hover/t:scale-110 group-hover/t:-rotate-6 motion-reduce:transition-none" style={{ background: `rgba(${rgb},0.18)`, color: `rgb(${rgb})` }}>
                      <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    {on && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: `rgb(${rgb})`, color: "#0b0c11" }}>
                        <Check size={14} strokeWidth={3} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold leading-snug text-foreground">{tr(t.label)}</span>
                    {t.unavailable && <span className="mt-0.5 block text-[10px] leading-tight text-muted">{tr("Not in our data yet")}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollReveal>
    </section>
  );
}
