"use client";

import { useState } from "react";
import { TrainFront, ChevronDown } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Tabs from "@/components/ui/Tabs";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TRAIN_LINES, type TrainCity, type TrainLineCategory } from "@/lib/data/trainLines";
import { TRAIN_STATUS_META } from "@/lib/data/trainStatus";

const ALL_LINES = "__all_lines__";
const CATEGORY_FILTERS: string[] = [ALL_LINES, "jr", "private", "subway"];

// Compact single-city train panel embedded on a city's own page
// (/tokyo, /osaka, /kyoto) — the fuller, multi-city experience with
// search, disruptions, and My Lines lives at /trains.
export default function CityTrainPanel({ city }: { city: TrainCity }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<string>(ALL_LINES);
  const [expanded, setExpanded] = useState<string | null>(null);

  const lines = TRAIN_LINES[city].filter(
    (line) => tab === ALL_LINES || line.category === (tab as TrainLineCategory),
  );

  function categoryLabel(tabValue: string) {
    if (tabValue === ALL_LINES) return t("tabs.allLines");
    return t(tabValue === "jr" ? "tabs.jr" : tabValue === "private" ? "tabs.private" : "tabs.subway");
  }

  return (
    <GlassCard className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-azure/15 text-azure">
            <TrainFront size={16} />
          </div>
          <p className="text-sm font-semibold text-foreground">
            <T k="widget.trainStatus" />
          </p>
        </div>
        <span className="rounded-full border border-glass-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
          <T k="footer.demoData" />
        </span>
      </div>

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
                <span className={`shrink-0 text-xs font-medium ${meta.textClass}`}>{t(meta.labelKey)}</span>
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
    </GlassCard>
  );
}
