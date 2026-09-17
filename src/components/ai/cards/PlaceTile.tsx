import { Landmark } from "lucide-react";
import Thumb from "@/components/ui/Thumb";

export interface PlaceTileProps {
  name: string;
  image?: string;
  gradient: string;
  description: string | null;
  href: string;
  subtitle?: string;
  badge?: { text: string; tone: "ongoing" | "upcoming" };
}

export default function PlaceTile({ name, image, gradient, description, href, subtitle, badge }: PlaceTileProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-w-[140px] max-w-[160px] shrink-0 flex-col gap-1.5"
    >
      <div className="relative">
        <Thumb gradient={gradient} icon={Landmark} src={image} alt={name} className="h-20 w-full" />
        {badge && (
          <span
            className={`absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
              badge.tone === "ongoing" ? "bg-mint/20 text-mint" : "bg-sakura/20 text-sakura"
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <p className="truncate text-[11px] font-medium text-foreground group-hover:text-azure">{name}</p>
      {subtitle && <p className="truncate text-[9px] text-muted">{subtitle}</p>}
      {description && <p className="line-clamp-2 text-[9px] text-muted/80">{description}</p>}
    </a>
  );
}
