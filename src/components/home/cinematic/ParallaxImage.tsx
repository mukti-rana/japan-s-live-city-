"use client";

import Image, { type ImageProps } from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

// A photograph that drifts a few percent against the page as it scrolls past — a
// decorative layer only (never text). It is drawn slightly larger than its frame so the
// drift never shows an edge. With reduced motion it is a plain, still photograph.
export default function ParallaxImage({ className = "", travel = 6, ...image }: Omit<ImageProps, "fill"> & { className?: string; travel?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
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
