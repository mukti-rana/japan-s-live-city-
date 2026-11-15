"use client";

import { CloudSun, Flame, Loader2, Luggage, Map, Newspaper, PartyPopper, Search, Siren, TrainFront, Wrench, type LucideIcon } from "lucide-react";
import { TOOL_LABELS } from "@/lib/ai/tools";
import { useTranslate } from "@/lib/i18n/inline";

// Kept here rather than in lib/ai/tools.ts so that module stays React-free —
// it is also imported by the assistant's server route.
const TOOL_ICONS: Record<string, LucideIcon> = {
  get_weather: CloudSun,
  get_train_status: TrainFront,
  get_earthquakes: Siren,
  get_events: PartyPopper,
  get_places: Map,
  get_news: Newspaper,
  get_trending: Flame,
  present_itinerary: Luggage,
  web_search: Search,
};

export default function ToolActivityPill({ tool }: { tool: string }) {
  const tr = useTranslate();
  const label = TOOL_LABELS[tool]?.label ?? tool;
  const Icon = TOOL_ICONS[tool] ?? Wrench;
  return (
    <span className="flex w-fit items-center gap-1.5 rounded-full border border-glass-border bg-glass-bg px-2.5 py-1 text-[11px] text-muted">
      <Loader2 size={11} className="animate-spin" aria-hidden="true" />
      <Icon size={12} className="shrink-0 text-lilac" aria-hidden="true" />
      {tr(label)}…
    </span>
  );
}
