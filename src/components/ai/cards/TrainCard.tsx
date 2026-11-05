"use client";

import { useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TrainFront, TriangleAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import CardHeader from "@/components/ai/cards/CardHeader";
import { TRAIN_STATUS_META, type TrainStatus } from "@/lib/data/trainStatus";
import type { TrainCardData } from "@/lib/ai/types";

function isTrainStatus(value: string): value is TrainStatus {
  return value in TRAIN_STATUS_META;
}

export default function TrainCard({ data }: { data: TrainCardData }) {
  const tr = useTranslate();
  const { t } = useLanguage();
  return (
    <GlassCard className="flex w-full max-w-sm flex-col gap-3 p-4">
      <CardHeader icon={TrainFront} label={`${tr("Train Lines")} — ${tr(data.city)}`} accent="azure" />

      <div className="flex items-start gap-2 rounded-lg border border-gold/25 bg-gold/5 p-2">
        <TriangleAlert size={13} className="mt-0.5 shrink-0 text-gold" />
        <p className="text-[10px] leading-relaxed text-muted">{tr(data.disclaimer)}</p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {data.lines.map((line) => {
          const meta = isTrainStatus(line.status) ? TRAIN_STATUS_META[line.status] : null;
          return (
            <li key={line.name} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 text-foreground/90">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
                {line.name}
              </span>
              <span className={meta?.textClass ?? "text-muted"}>
                {meta ? t(meta.labelKey) : tr(line.status)}
                {line.delayMinutes ? ` (${line.delayMinutes} ${tr("min")})` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
