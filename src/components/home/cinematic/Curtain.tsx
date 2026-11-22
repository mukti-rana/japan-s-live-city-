"use client";

import { useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

const clamp = (v: number) => Math.min(1, Math.max(0, v));

// "Text under the photograph": the stage (the chapter's big heading) stays put at the top of the screen while the first photograph
// rises from below and slides over it like a curtain. As it covers the heading, the heading draws back a little (smaller, dimmer, a
// touch higher), so the photograph feels nearer. Once the photograph has passed, the stage scrolls away with the rest of the chapter.
// It is the page's one pinned moment, it is driven by the reader's own scrolling (nothing is scroll-jacked), and with reduced motion
// it is a plain heading followed by a plain photograph.
export default function Curtain({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  const cover = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: cover, offset: ["start end", "start start"] });
  const p = useSpring(scrollYProgress, { stiffness: 150, damping: 32, mass: 0.5 });
  const scale = useTransform(p, (v) => 1 - clamp(v) * 0.09);
  const opacity = useTransform(p, (v) => 1 - clamp(v) * 0.7);
  const y = useTransform(p, (v) => `${-clamp(v) * 5}%`);

  const on = mounted && !reduce;
  return (
    <div className="relative">
      <div className="sticky top-0 z-0 flex min-h-[88svh] items-start pt-[clamp(72px,15svh,170px)] motion-reduce:static">
        <motion.div className="w-full origin-top-left" style={on ? ({ scale, opacity, y, willChange: "transform, opacity" } as unknown as CSSProperties) : undefined}>
          {stage}
        </motion.div>
      </div>
      <div ref={cover} className="relative z-10">
        {children}
      </div>
    </div>
  );
}
