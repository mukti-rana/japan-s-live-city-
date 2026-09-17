"use client";

import { TrainFront, ChevronRight } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import Tabs from "@/components/ui/Tabs";
import { mockTrainLines } from "@/lib/mock/dashboard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function TrainListWidget() {
  const { t } = useLanguage();
  const trainTabs = [t("tabs.allLines"), t("tabs.jr"), t("tabs.private"), t("tabs.subway")];

  return (
    <WidgetFrame
      icon={TrainFront}
      labelKey="widget.liveTrainStatus"
      accent="azure"
      viewAll
      viewAllHref="/trains"
    >
      <Tabs tabs={trainTabs} />

      <ul className="flex flex-col">
        {mockTrainLines.map((line) => (
          <li key={line.name}>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 border-b border-glass-border py-2.5 text-left transition-colors hover:bg-glass-bg"
            >
              <span
                className="h-6 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: line.color }}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                {line.name}
                {line.note && (
                  <span className="text-muted"> ({line.note})</span>
                )}
              </span>
              <span className="shrink-0 text-xs font-medium text-mint">
                {line.status}
              </span>
              <ChevronRight size={13} className="shrink-0 text-muted" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-3 py-2.5">
        <TrainFront size={15} className="text-azure" />
        <span className="flex-1 text-xs text-foreground/85">
          {t("widget.noMajorDelays")}
        </span>
        <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
      </div>
    </WidgetFrame>
  );
}
