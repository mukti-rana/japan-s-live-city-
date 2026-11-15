import type { ReactNode } from "react";

// Static label: a status, a count, a category. Not clickable — use Chip when
// the reader can act on it.
//
// `sakura` and `gold` exist for Japanese cultural, seasonal and festival
// content only. Everything else should use a semantic tone so meaning is not
// carried by an arbitrary brand colour.
type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "sakura" | "gold";

const TONE: Record<Tone, string> = {
  neutral: "border-line bg-surface-2 text-text-secondary",
  accent: "border-accent/35 bg-accent/12 text-accent",
  success: "border-success/35 bg-success/12 text-success",
  warning: "border-warning/35 bg-warning/12 text-warning",
  danger: "border-danger/35 bg-danger/12 text-danger",
  sakura: "border-brand-sakura/35 bg-brand-sakura/12 text-brand-sakura",
  gold: "border-brand-gold/35 bg-brand-gold/12 text-brand-gold",
};

export default function Badge({
  tone = "neutral",
  icon,
  children,
  className = "",
}: {
  tone?: Tone;
  /** Decorative icons should carry aria-hidden where they are passed in. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
