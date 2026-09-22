"use client";

import { useState } from "react";
import { TrainFront, ChevronDown } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import Tabs from "@/components/ui/Tabs";
import type { CitySlug, TrainLineCategory } from "@/lib/data/cities";
import { CITY_TRAIN_LINES } from "@/lib/data/cities";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const CATEGORY_FILTERS: (TrainLineCategory | "all")[] = ["all", "jr", "private", "subway"];

export default function CityTrainPanel({ city }: { city: CitySlug }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<(typeof CATEGORY_FILTERS)[number]>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const allLines = CITY_TRAIN_LINES[city];
  const lines = allLines.filter((line) => tab === "all" || line.category === tab);

  const tabLabels: Record<(typeof CATEGORY_FILTERS)[number], string> = {
    all: t("tabs.allLines"),
    jr: t("tabs.jr"),
    private: t("tabs.private"),
    subway: t("tabs.subway"),
  };

  return (
    <WidgetFrame
      icon={TrainFront}
      labelKey="widget.trainStatus"
      accent="azure"
      action={
        <span className="rounded-full border border-glass-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          {t("footer.demoData")}
        </span>
      }
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
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {line.name}
                </span>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    line.status === "Normal" ? "text-mint" : "text-gold"
                  }`}
                >
                  {line.status}
                </span>
                <ChevronDown
                  size={14}
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
      <p className="mt-1 text-[11px] text-muted">
        {t("widget.trainPlaceholderNote")}
      </p>
    </WidgetFrame>
  );
}
