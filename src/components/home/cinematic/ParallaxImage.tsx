"use client";

import Image, { type ImageProps } from "next/image";
import { useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

// A photograph that drifts a few percent against the page as it scrolls past — a
// decorative layer only (never text). It is drawn slightly larger than its frame so the
// drift never shows an edge. With reduced motion it is a plain, still photograph.
export default function ParallaxImage({ className = "", travel = 6, ...image }: Omit<ImageProps, "fill"> & { className?: string; travel?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Reduced motion is only known in the browser; waiting for it to mount keeps the first browser render identical to the
  // server's, so there is no hydration mismatch for a visitor who has reduced motion on.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const reduce = useReducedMotion() && mounted;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${travel}%`, `${travel}%`]);

  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div className="absolute inset-0" style={reduce ? undefined : { y, scale: 1 + (travel * 2) / 100 + 0.02 }}>
        <Image fill {...image} alt={image.alt} />
      </motion.div>
    </div>
  );
}
