import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";
import ViewAllButton from "@/components/ui/ViewAllButton";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

const ACCENTS = {
  sakura: "bg-sakura/15 text-sakura",
  gold: "bg-gold/15 text-gold",
  azure: "bg-azure/15 text-azure",
  mint: "bg-mint/15 text-mint",
};

export default function WidgetFrame({
  icon: Icon,
  labelKey,
  accent = "azure",
  action,
  viewAll = false,
  viewAllHref,
  live = false,
  children,
  className = "",
}: {
  icon: LucideIcon;
  labelKey: TranslationKey;
  accent?: keyof typeof ACCENTS;
  action?: ReactNode;
  viewAll?: boolean;
  viewAllHref?: string;
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={`flex flex-col gap-3.5 p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ACCENTS[accent]}`}
          >
            <Icon size={15} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/90">
            <T k={labelKey} />
          </p>
        </div>

        {/* Everything on the right stays together, with View All last. */}
        <div className="ml-auto flex items-center gap-2">
          {action}

          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-medium text-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
              <T k="widget.live" />
            </span>
          )}

          {viewAll && viewAllHref && <ViewAllButton href={viewAllHref} />}
        </div>
      </div>

      {children}
    </GlassCard>
  );
}
