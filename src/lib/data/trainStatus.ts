import { CircleCheck, CircleAlert, TriangleAlert, OctagonAlert, CircleHelp, type LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

export type TrainStatus = "normal" | "minorDelay" | "delayed" | "suspended" | "unknown";

export const TRAIN_STATUS_META: Record<
  TrainStatus,
  { icon: LucideIcon; dotClass: string; textClass: string; labelKey: TranslationKey }
> = {
  normal: { icon: CircleCheck, dotClass: "bg-mint", textClass: "text-mint", labelKey: "trains.status.normal" },
  minorDelay: { icon: CircleAlert, dotClass: "bg-gold", textClass: "text-gold", labelKey: "trains.status.minorDelay" },
  delayed: { icon: TriangleAlert, dotClass: "bg-[#f2994a]", textClass: "text-[#f2994a]", labelKey: "trains.status.delayed" },
  suspended: { icon: OctagonAlert, dotClass: "bg-sakura", textClass: "text-sakura", labelKey: "trains.status.suspended" },
  unknown: { icon: CircleHelp, dotClass: "bg-muted", textClass: "text-muted", labelKey: "trains.status.unknown" },
};

export const TRAIN_STATUS_ORDER: TrainStatus[] = ["normal", "minorDelay", "delayed", "suspended", "unknown"];

export function summarizeStatuses(statuses: TrainStatus[]): Record<TrainStatus, number> {
  const counts: Record<TrainStatus, number> = {
    normal: 0,
    minorDelay: 0,
    delayed: 0,
    suspended: 0,
    unknown: 0,
  };
  for (const status of statuses) counts[status] += 1;
  return counts;
}
