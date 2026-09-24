"use client";

import { useState } from "react";
import { TrainFront, ChevronDown } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import Tabs from "@/components/ui/Tabs";
import { TRAIN_LINES, findTrainCity, type TrainCity, type TrainLineCategory } from "@/lib/data/trainLines";
import { TRAIN_STATUS_META } from "@/lib/data/trainStatus";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";

const DEFAULT_CITY: TrainCity = "tokyo";
const ALL_LINES = "__all_lines__";
const CATEGORY_FILTERS: string[] = [ALL_LINES, "jr", "private", "subway"];

export default function TrainListWidget() {
  const { t } = useLanguage();
  const { location } = useLiveLocation();
  const [tab, setTab] = useState<string>(ALL_LINES);
  const [expanded, setExpanded] = useState<string | null>(null);

  const city = (location?.name ? findTrainCity(location.name) : undefined) ?? DEFAULT_CITY;
  const lines = TRAIN_LINES[city].filter(
    (line) => tab === ALL_LINES || line.category === (tab as TrainLineCategory),
  );
  const hasDelays = lines.some((line) => line.status !== "normal");

  function categoryLabel(tabValue: string) {
    if (tabValue === ALL_LINES) return t("tabs.allLines");
    return t(tabValue === "jr" ? "tabs.jr" : tabValue === "private" ? "tabs.private" : "tabs.subway");
  }

  return (
    <WidgetFrame icon={TrainFront} labelKey="widget.trainStatus" accent="azure" viewAll viewAllHref="/trains">
      <Tabs tabs={CATEGORY_FILTERS} value={tab} onChange={setTab} getLabel={categoryLabel} />

      <ul className="flex flex-col">
        {lines.map((line) => {
          const isOpen = expanded === line.name;
          const meta = TRAIN_STATUS_META[line.status];
          return (
            <li key={line.name} className="border-b border-glass-border last:border-0">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : line.name)}
                className="flex w-full items-center gap-2.5 py-2.5 text-left transition-colors hover:bg-glass-bg"
              >
                <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: line.color }} />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {line.name}
                  {line.affectedArea && <span className="text-muted"> ({line.affectedArea})</span>}
                </span>
                <span className={`shrink-0 text-xs font-medium ${meta.textClass}`}>
                  {t(meta.labelKey)}
                </span>
                <ChevronDown
                  size={13}
                  className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <p className="ml-4 pb-2.5 pr-2 text-[11px] text-muted">
                  {line.status !== "normal" && line.delayMinutes ? `${line.delayMinutes} ${t("train.minDelay")} — ` : ""}
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
