"use client";

import { useState } from "react";
import { TrainFront, ChevronDown } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import Tabs from "@/components/ui/Tabs";
import { CITIES, CITY_TRAIN_LINES, type CitySlug, type TrainLineCategory } from "@/lib/data/cities";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";

const DEFAULT_CITY_SLUG: CitySlug = "tokyo";

const CATEGORY_FILTERS: (TrainLineCategory | "all")[] = ["all", "jr", "private", "subway"];

function cityForLocation(name: string | undefined): CitySlug {
  if (!name) return DEFAULT_CITY_SLUG;
  const needle = name.toLowerCase();
  const match = CITIES.find((city) => needle.includes(city.name.toLowerCase()));
  return match?.slug ?? DEFAULT_CITY_SLUG;
}

export default function TrainListWidget() {
  const { t } = useLanguage();
  const { location } = useLiveLocation();
  const [tab, setTab] = useState<(typeof CATEGORY_FILTERS)[number]>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const citySlug = cityForLocation(location?.name);
  const lines = CITY_TRAIN_LINES[citySlug].filter((line) => tab === "all" || line.category === tab);
  const hasDelays = lines.some((line) => line.status !== "Normal");

  const tabLabels: Record<(typeof CATEGORY_FILTERS)[number], string> = {
    all: t("tabs.allLines"),
    jr: t("tabs.jr"),
    private: t("tabs.private"),
    subway: t("tabs.subway"),
  };

  return (
    <WidgetFrame
      icon={TrainFront}
      labelKey="widget.liveTrainStatus"
      accent="azure"
      viewAll
      viewAllHref="/trains"
    >
      <Tabs
        tabs={CATEGORY_FILTERS.map((c) => tabLabels[c])}
        value={tabLabels[tab]}
        onChange={(label) => {
          const match = CATEGORY_FILTERS.find((c) => tabLabels[c] === label);
          if (match) setTab(match);
        }}
      />

      <ul className="flex flex-col">
        {lines.map((line) => {
          const isOpen = expanded === line.name;
          return (
            <li key={line.name} className="border-b border-glass-border last:border-0">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : line.name)}
                className="flex w-full items-center gap-2.5 py-2.5 text-left transition-colors hover:bg-glass-bg"
              >
                <span
                  className="h-6 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {line.name}
                  {line.note && <span className="text-muted"> ({line.note})</span>}
                </span>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    line.status === "Normal" ? "text-mint" : "text-gold"
                  }`}
                >
                  {line.status}
                </span>
                <ChevronDown
                  size={13}
                  className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <p className="ml-4 pb-2.5 pr-2 text-[11px] text-muted">
                  {line.status !== "Normal" && line.delayMinutes
                    ? `${line.delayMinutes} ${t("train.minDelay")} — `
                    : ""}
                  {t("train.demoNote")}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-3 py-2.5">
        <TrainFront size={15} className="text-azure" />
        <span className="flex-1 text-xs text-foreground/85">
          {hasDelays ? t("train.delaysReported") : t("widget.noMajorDelays")}
        </span>
        <span className="rounded-full border border-glass-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
          {t("footer.demoData")}
        </span>
      </div>
    </WidgetFrame>
  );
}
