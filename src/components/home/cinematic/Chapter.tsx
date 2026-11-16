import Link from "next/link";
import type { ReactNode } from "react";
import Tx from "@/components/i18n/Tx";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";

// One chapter of the homepage: a small numbered label, a large serif heading, an
// optional one-line introduction and a link to the full page, then the content.
// The heading is a real <h2>, so the page keeps a clean outline with all motion off.
export default function Chapter({
  id,
  number,
  label,
  title,
  intro,
  href,
  linkLabel,
  children,
  className = "",
  flush = false,
}: {
  id: string;
  number: string;
  label: string;
  title: string;
  intro?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
  // No top padding (for a chapter that continues the one above it).
  flush?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`relative scroll-mt-16 ${flush ? "pb-[clamp(64px,10vw,128px)]" : "py-[clamp(64px,10vw,128px)]"} ${className}`}>
      <div className="mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,48px)]">
        <ScrollReveal className="mb-[clamp(24px,4vw,48px)] flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">
              <span className="tabular-nums">{number}</span> <span aria-hidden="true">·</span> <Tx en={label} />
            </p>
            <h2 id={`${id}-h`} className="mt-3 font-[family-name:var(--font-home-serif)] text-[clamp(34px,5.4vw,64px)] font-normal leading-[1.04] tracking-[-0.02em] text-foreground">
              <Tx en={title} />
            </h2>
            {intro && (
              <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-text-secondary">
                <Tx en={intro} />
              </p>
            )}
          </div>
          {href && linkLabel && (
            <Link href={href} className="inline-flex h-11 items-center border-b border-line-strong pb-0.5 text-sm text-text-secondary transition-colors hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Tx en={linkLabel} />
              <span aria-hidden="true" className="ml-1.5">→</span>
            </Link>
          )}
        </ScrollReveal>
        {children}
      </div>
    </section>
  );
}
