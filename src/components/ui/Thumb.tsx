import Image from "next/image";
import { type LucideIcon } from "lucide-react";

export default function Thumb({
  gradient,
  icon: Icon,
  src,
  alt = "",
  className = "",
}: {
  gradient: string;
  icon?: LucideIcon;
  src?: string;
  alt?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-glass-border bg-gradient-to-br ${gradient} bg-panel ${className}`}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes="120px" className="object-cover" />
      ) : (
        Icon && (
          <Icon
            size={16}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground/40"
          />
        )
      )}
    </div>
  );
}
