"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslate } from "@/lib/i18n/inline";

// Chapter dots down the right edge (wide screens only). Nothing is drawn while the page is at rest:
// the dots appear while scrolling, when the pointer goes to the right edge, or when a keyboard user
// tabs into them, then fade away again. The current chapter is a slightly larger white dot, never a bar.
// It is a real list of links, so it works with a keyboard and a screen reader, and clicking one scrolls
// there (instantly with reduced motion).
export default function ChapterRail({ chapters }: { chapters: { id: string; label: string }[] }) {
  const tr = useTranslate();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(chapters[0]?.id);
  const [awake, setAwake] = useState(false);
  const [near, setNear] = useState(false);

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

  // Wake on scroll, sleep again a moment after it stops; wake when the pointer nears the right edge.
  useEffect(() => {
    let timer = 0;
    const onScroll = () => {
      setAwake(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAwake(false), 1600);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const fromRight = window.innerWidth - event.clientX;
      if (fromRight < 72) setNear(true);
      else if (fromRight > 140) setNear(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.clearTimeout(timer);
    };
  }, []);

  const shown = awake || near;

  return (
    <nav
      aria-label={tr("Chapters")}
      className={`fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 transition-opacity duration-500 focus-within:opacity-100 motion-reduce:transition-none xl:block ${shown ? "opacity-100" : "opacity-0"}`}
    >
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
                <span className={`block h-1.5 w-1.5 rounded-full transition-all duration-300 group-hover:scale-150 group-hover:bg-white group-focus-visible:ring-2 group-focus-visible:ring-azure ${on ? "scale-150 bg-white" : "bg-white/40"}`} />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
