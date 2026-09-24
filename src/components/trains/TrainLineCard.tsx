"use client";

import Link from "next/link";
import { ChevronDown, Star, MapPin, Compass } from "lucide-react";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TRAIN_STATUS_META } from "@/lib/data/trainStatus";
import type { TrainLineInfo } from "@/lib/data/trainLines";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

const CATEGORY_LABEL: Record<TrainLineInfo["category"], TranslationKey> = {
  jr: "tabs.jr",
  private: "tabs.private",
  subway: "tabs.subway",
};

export default function TrainLineCard({
  line,
  city,
  expanded,
  onToggleExpand,
  followed,
  onToggleFollow,
}: {
  line: TrainLineInfo;
  city: string;
  expanded: boolean;
  onToggleExpand: () => void;
  followed: boolean;
  onToggleFollow: () => void;
}) {
  const { t } = useLanguage();
  const meta = TRAIN_STATUS_META[line.status];
  const StatusIcon = meta.icon;
  const hasDetails = Boolean(line.reason || line.affectedArea || line.direction);

  return (
    <div className="rounded-xl border border-glass-border bg-glass-bg p-3">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: line.color }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-foreground">{line.name}</p>
            {line.nameJa && <p className="font-jp shrink-0 truncate text-xs text-muted">{line.nameJa}</p>}
          </div>
          <p className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${meta.textClass}`}>
            <StatusIcon size={12} />
            <T k={meta.labelKey} />
            {line.delayMinutes ? ` · ${line.delayMinutes} min` : ""}
          </p>
          {line.affectedArea && !expanded && (
            <p className="mt-0.5 truncate text-[11px] text-muted">{line.affectedArea}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleFollow}
          aria-label={t(followed ? "trains.following" : "trains.follow")}
          className={`shrink-0 rounded-full p-1.5 transition-colors ${
            followed ? "text-gold" : "text-muted hover:text-gold"
          }`}
        >
          <Star size={15} fill={followed ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-glass-bg-strong px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          <T k={CATEGORY_LABEL[line.category]} />
        </span>
        {hasDetails && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-[11px] font-medium text-azure hover:underline"
          >
            <T k="trains.details" />
            <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="mt-3 flex flex-col gap-2 border-t border-glass-border pt-3 text-xs">
          {line.reason && (
            <p>
              <span className="text-muted">
                <T k="trains.reason" />:{" "}
              </span>
              <span className="text-foreground">{line.reason}</span>
            </p>
          )}
          {line.affectedArea && (
            <p>
              <span className="text-muted">
                <T k="trains.affectedArea" />:{" "}
              </span>
              <span className="text-foreground">{line.affectedArea}</span>
            </p>
          )}
          {line.direction && (
            <p>
              <span className="text-muted">
                <T k="trains.direction" />:{" "}
              </span>
              <span className="text-foreground">➡️ {line.direction}</span>
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            <Link
              href="/map"
              className="flex items-center gap-1 rounded-full border border-glass-border bg-glass-bg-strong px-2.5 py-1 text-[11px] font-medium text-foreground/85 hover:text-azure"
            >
              <MapPin size={11} />
              <T k="trains.openMap" />
            </Link>
            <Link
              href={`/ai-assistant?q=${encodeURIComponent(
                `What's the fastest alternative to ${line.name} in ${city} right now?`,
              )}`}
              className="flex items-center gap-1 rounded-full border border-glass-border bg-glass-bg-strong px-2.5 py-1 text-[11px] font-medium text-foreground/85 hover:text-azure"
            >
              <Compass size={11} />
              <T k="trains.planRoute" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
