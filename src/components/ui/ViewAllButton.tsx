import Link from "next/link";
import { ArrowRight } from "lucide-react";
import T from "@/components/i18n/T";

// The one "View All →" button used in every homepage section header. It is a
// real link to the section's full page, styled to be noticed: a soft blue
// fill with a visible border, 36px tall on phones (a comfortable touch target)
// and 32px on larger screens.
export default function ViewAllButton({
  href,
  label,
  className = "",
}: {
  href: string;
  // Spoken name for assistive technology when the visible label is just "View All".
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group/viewall inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-azure/35 bg-azure/10 px-3 text-xs font-semibold text-azure transition-all duration-200 hover:border-azure/60 hover:bg-azure/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.96] sm:h-8 ${className}`}
    >
      <T k="widget.viewAll" />
      <ArrowRight size={14} aria-hidden="true" className="transition-transform duration-200 group-hover/viewall:translate-x-0.5" />
    </Link>
  );
}
