"use client";

import { useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

export type Edge = "left" | "right" | "bottom" | "center";

const clamp = (v: number) => Math.min(1, Math.max(0, v));

// A photograph that arrives with the scroll, from its own edge. As the frame's top rises from the bottom of the screen to a little
// above the middle, the frame slides in from that side while a wipe opens it (an inset clip that retreats toward the far edge), so
// it reads as a panel being drawn across; the progress is also published as the CSS variable --rv (0 to 1), which the photograph
// inside uses to settle from a close-up (scale) and the caption uses to rise and fade in. Because it follows the scroll it plays
// both ways and never gets ahead of or behind the reader; a light spring smooths a jerky wheel. Reduced motion, or the first paint
// before the browser knows the visitor's preference, shows the frame in place with no styles at all. "center" is a different move:
// the frame unfolds from a smaller, rounded window in the middle (inset clip with rounded corners, a small scale-up and a short rise).
export default function RevealFrame({ from, children, className = "" }: { from: Edge; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 97%", "start 36%"] });
  const p = useSpring(scrollYProgress, { stiffness: 150, damping: 30, mass: 0.5 });

  const x = useTransform(p, (v) => (from === "bottom" ? "0vw" : `${(from === "left" ? -1 : 1) * (1 - clamp(v)) * 16}vw`));
  const y = useTransform(p, (v) => (from === "bottom" ? `${(1 - clamp(v)) * 9}vh` : from === "center" ? `${(1 - clamp(v)) * 5}vh` : "0vh"));
  const scale = useTransform(p, (v) => (from === "center" ? 0.92 + clamp(v) * 0.08 : 1));
  const clip = useTransform(p, (v) => {
    if (v >= 0.995) return "none"; // finished: nothing is clipped any more (so a shadow or glow is never cut off)
    const k = (1 - clamp(v)) * 62;
    if (from === "center") return `inset(${(1 - clamp(v)) * 24}% ${(1 - clamp(v)) * 20}% ${(1 - clamp(v)) * 24}% ${(1 - clamp(v)) * 20}% round ${(1 - clamp(v)) * 36}px)`;
    return from === "left" ? `inset(0% ${k}% 0% 0%)` : from === "right" ? `inset(0% 0% 0% ${k}%)` : `inset(${k * 0.9}% 0% 0% 0%)`;
  });
  const opacity = useTransform(p, (v) => Math.min(1, clamp(v) * 3.2));
  const rv = useTransform(p, (v) => clamp(v).toFixed(3));

  const on = mounted && !reduce;
  return (
    <motion.div ref={ref} className={className} style={on ? ({ x, y, scale, clipPath: clip, opacity, "--rv": rv, willChange: "transform, clip-path" } as unknown as CSSProperties) : undefined}>
      {children}
    </motion.div>
  );
}
