"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// A chapter's content fades in with a small rise the first time it scrolls into view.
// Only opacity and transform move. With reduced motion it simply renders in place.
export default function ScrollReveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
