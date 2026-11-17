"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// How a block arrives as it scrolls into view (the motion itself is CSS, in cinematic.css):
//   up, left, right, slide-left, slide-right, image, scale, pop, stagger, line, fade.
export type RevealFrom = "up" | "left" | "right" | "slide-left" | "slide-right" | "image" | "scale" | "pop" | "stagger" | "line" | "fade";

// One pair of observers serves every block on the page (cheaper on a phone than one pair each):
//  - the "enter" observer reveals a block once a little of it is inside the screen;
//  - the "exit" observer re-arms it only when it is completely off screen, noting whether it left through
//    the top (so it comes back from above when you scroll up). Because the reset happens off screen it is
//    never seen, and a block at the edge of the screen cannot flicker.
let observers: { enter: IntersectionObserver; exit: IntersectionObserver } | null = null;
function getObservers() {
  if (observers) return observers;
  observers = {
    enter: new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) (entry.target as HTMLElement).dataset.in = "true";
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    ),
    exit: new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting || el.dataset.in !== "true") continue;
        el.dataset.side = entry.boundingClientRect.bottom <= 0 ? "top" : "bottom";
        delete el.dataset.in;
      }
    }),
  };
  return observers;
}

// `delay` (seconds) staggers siblings. Reduced motion, or no scripting, shows every block in place.
export default function ScrollReveal({ children, delay = 0, from = "up", className = "" }: { children?: ReactNode; delay?: number; from?: RevealFrom; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.in = "true";
      return;
    }
    const { enter, exit } = getObservers();
    enter.observe(el);
    exit.observe(el);
    return () => {
      enter.unobserve(el);
      exit.unobserve(el);
    };
  }, []);

  return (
    <div ref={ref} data-reveal={from} style={delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : undefined} className={className}>
      {children}
    </div>
  );
}
