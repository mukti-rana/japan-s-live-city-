import { type LucideIcon } from "lucide-react";

const ACCENTS = {
  sakura: "bg-sakura/15 text-sakura",
  gold: "bg-gold/15 text-gold",
  azure: "bg-azure/15 text-azure",
  mint: "bg-mint/15 text-mint",
};

export default function CardHeader({
  icon: Icon,
  label,
  accent = "azure",
}: {
  icon: LucideIcon;
  label: string;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${ACCENTS[accent]}`}>
        <Icon size={13} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/90">{label}</p>
    </div>
  );
}
