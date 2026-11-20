import Link from "next/link";
import type { ReactNode } from "react";

// A link that is only an arrow: no box, no border, no fill. The arrow breathes forward slowly at rest, and when pointed at (or focused) it opens: the shaft
// stretches out and the head runs ahead of it. The words ("View All", "Weather"...) are still there for screen readers and as the link's name; only the sight
// of them is gone. 44px tall to touch. Plain CSS (see .arrow-link in globals.css); under reduced motion it is a still arrow.
export default function ArrowLink({ href, label, children, className = "" }: { href: string; label?: string; children?: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`arrow-link group/arrow inline-flex h-11 min-w-11 shrink-0 items-center justify-end rounded-full px-1.5 text-white/70 transition-colors duration-300 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${className}`}
    >
      {children && <span className="sr-only">{children}</span>}
      <span aria-hidden="true" className="arrow-link__glyph relative block h-4 w-11">
        <span className="arrow-link__shaft absolute left-0 top-1/2 block h-px w-6 -translate-y-1/2 origin-left bg-current" />
        <svg className="arrow-link__head absolute left-[17px] top-1/2 -mt-[7px]" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 1.5 10 7l-5.5 5.5" />
        </svg>
      </span>
    </Link>
  );
}
