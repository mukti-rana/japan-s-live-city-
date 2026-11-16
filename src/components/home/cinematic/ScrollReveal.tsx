"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Where a block comes from as it scrolls into view:
//   up    a small rise (the default, and what every direction does on a phone)
//   left  a gentle slide in from the left, right likewise (tablet and up, for side-by-side layouts)
//   line  a hairline that draws itself from the left
//   fade  no movement at all, only opacity
export type RevealFrom = "up" | "left" | "right" | "line" | "fade";

// The motion itself is plain CSS in cinematic.css (opacity and transform only, once per block, no
// scripting beyond one IntersectionObserver per block). Reduced motion, or no scripting, shows
// every block in place straight away. `delay` (seconds) staggers siblings.
export default function ScrollReveal({ children, delay = 0, from = "up", className = "" }: { children?: ReactNode; delay?: number; from?: RevealFrom; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.in = "true";
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.in = "true";
        io.disconnect();
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal={from} style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined} className={className}>
      {children}
    </div>
  );
}
