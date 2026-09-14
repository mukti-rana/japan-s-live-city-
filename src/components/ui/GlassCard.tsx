"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";

export default function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`rounded-2xl border border-glass-border bg-glass-bg backdrop-blur-xl transition-colors duration-300 hover:border-azure/30 hover:shadow-[0_8px_40px_-12px_rgba(77,163,255,0.35)] ${className}`}
    >
      {children}
    </motion.div>
  );
}
