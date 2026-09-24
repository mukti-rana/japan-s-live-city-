"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";

// Stagger-load entrance for the homepage's "Ops" theme — a punchier
// scale+lift version of Reveal's plain fade, approximating the
// back.out(1.4) overshoot from the Ops design system's motion spec. Kept
// separate from Reveal (rather than a variant of it) so it only ever
// affects the homepage — every other page keeps Reveal's fade untouched.
export default function OpsReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.34, 1.56, 0.64, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
