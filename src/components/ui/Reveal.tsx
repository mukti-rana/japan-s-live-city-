"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";

export default function Reveal({
  children,
  delay = 0,
  className = "",
  inView = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  // Wait until the element scrolls into view before animating, so content
  // further down the page transitions in as you reach it instead of animating
  // unseen on load. Everything else keeps the original on-mount behaviour.
  inView?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const target = { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={inView ? undefined : target}
      whileInView={inView ? target : undefined}
      viewport={inView ? { once: true, margin: "0px 0px -60px 0px" } : undefined}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
