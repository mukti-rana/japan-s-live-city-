import Link from "next/link";
import type { ReactNode } from "react";
import Tx from "@/components/i18n/Tx";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import SlideInHeading from "@/components/home/cinematic/SlideInHeading";

// The chapter's opening: a hairline, a small numbered label, a large serif heading, an
// optional one-line introduction and a link to the full page. The heading is a real <h2> that glides in
// from the right as one piece (SlideInHeading), so the page keeps a clean outline with all motion off.
export function ChapterHeader({
  id,
  number,
  label,
  heading,
  intro,
  href,
  linkLabel,
  className = "",
}: {
  id: string;
  number: string;
  label: string;
  heading: string;
  intro?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* The hairline draws itself, then the label, heading, line of text and link follow it. */}
      <ScrollReveal from="line" className="h-px w-full bg-white/10" />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 pt-[clamp(20px,3vh,32px)]">
        <div className="min-w-0">
          <ScrollReveal delay={0.1}>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">
              <span className="tabular-nums">{number}</span> <span aria-hidden="true">·</span> <Tx en={label} />
            </p>
          </ScrollReveal>
          <h2 id={`${id}-h`} className="mt-[clamp(14px,2.4vh,28px)] font-[family-name:var(--font-home-serif)] text-[clamp(44px,7.4vw,116px)] font-normal leading-[0.98] tracking-[-0.025em] text-foreground">
            <SlideInHeading>
              <Tx en={heading} />
            </SlideInHeading>
          </h2>
          {intro && (
            <ScrollReveal delay={0.3}>
              <p className="mt-[clamp(14px,2.4vh,28px)] max-w-[54ch] text-[clamp(16px,1.35vw,20px)] leading-relaxed text-text-secondary">
                <Tx en={intro} />
              </p>
            </ScrollReveal>
          )}
        </div>
        {href && linkLabel && (
          <ScrollReveal from="right" delay={0.36}>
            <Link href={href} className="inline-flex h-11 items-center rounded-full border border-white/20 bg-black/50 px-5 text-sm text-white/85 backdrop-blur-sm transition-colors hover:border-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Tx en={linkLabel} />
              <span aria-hidden="true" className="ml-1.5">→</span>
            </Link>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}

// One chapter of the homepage. It is at least a screen tall and its content sits in the
// middle of that screen, so a short chapter is never a strip at the top of an empty page;
// a tall one just runs on. `screen={false}` drops the minimum height.
export const CHAPTER_WIDTH = "mx-auto w-full max-w-[1480px] px-(--home-gutter)";

export default function Chapter({
  id,
  number,
  label,
  heading,
  intro,
  href,
  linkLabel,
  children,
  className = "",
  flush = false,
  screen = true,
}: {
  id: string;
  number: string;
  label: string;
  heading: string;
  intro?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
  // No top padding (for a chapter that continues the one above it).
  flush?: boolean;
  screen?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={`relative flex scroll-mt-16 flex-col justify-center ${screen ? "min-h-[100svh]" : ""} ${flush ? "pb-[clamp(72px,12vh,160px)]" : "py-[clamp(72px,12vh,160px)]"} ${className}`}
    >
      <div className={CHAPTER_WIDTH}>
        <ChapterHeader id={id} number={number} label={label} heading={heading} intro={intro} href={href} linkLabel={linkLabel} className="mb-[clamp(32px,6vh,72px)]" />
        {children}
      </div>
    </section>
  );
}
