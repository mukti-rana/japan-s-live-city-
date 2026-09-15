import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

const ACCENTS = {
  sakura: "bg-sakura/15 text-sakura",
  gold: "bg-gold/15 text-gold",
  azure: "bg-azure/15 text-azure",
  mint: "bg-mint/15 text-mint",
};

export default function WidgetFrame({
  icon: Icon,
  label,
  accent = "azure",
  action,
  viewAll = false,
  viewAllHref,
  live = false,
  children,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${ACCENTS[accent]}`}
          >
            <Icon size={15} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/90">
            {label}
          </p>
        </div>

        {action}

        {live && (
          <span className="flex items-center gap-1.5 rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-medium text-mint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
            Live
          </span>
        )}

        {viewAll && viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-0.5 text-[11px] font-medium text-muted transition-colors hover:text-azure"
          >
            View all
            <ChevronRight size={12} />
          </Link>
        )}

        {viewAll && !viewAllHref && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-muted/50">
            View all
            <ChevronRight size={12} />
          </span>
        )}
      </div>

      {children}
    </GlassCard>
  );
}
