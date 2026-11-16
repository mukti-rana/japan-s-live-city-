"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslate } from "@/lib/i18n/inline";

// A thin progress indicator down the right edge (wide screens only): one mark per
// chapter, the current one lengthened. It is a real list of links, so it works with a
// keyboard and a screen reader, and clicking one scrolls there (instantly with reduced motion).
export default function ChapterRail({ chapters }: { chapters: { id: string; label: string }[] }) {
  const tr = useTranslate();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(chapters[0]?.id);

  useEffect(() => {
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best = "";
        let top = 0;
        for (const [id, ratio] of seen) {
          if (ratio > top) {
            best = id;
            top = ratio;
          }
        }
        if (best) setActive(best);
      },
      { threshold: [0, 0.15, 0.35, 0.6], rootMargin: "-20% 0px -35% 0px" },
    );
    for (const c of chapters) {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [chapters]);

  return (
    <nav aria-label={tr("Chapters")} className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 xl:block">
      <ul className="flex flex-col items-end gap-1">
        {chapters.map((c) => {
          const on = active === c.id;
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={on ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(c.id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
                }}
                className="group relative flex h-6 w-6 items-center justify-end focus-visible:outline-none"
              >
                <span className="pointer-events-none absolute right-6 whitespace-nowrap rounded-full bg-black/80 px-2.5 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{tr(c.label)}</span>
                <span className={`block w-1.5 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-azure ${on ? "h-5 bg-white" : "h-1.5 bg-white/30 group-hover:bg-white/60"}`} />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
