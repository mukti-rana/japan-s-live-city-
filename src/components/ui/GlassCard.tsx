"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";

// The project's card. Extended with variants rather than replaced, so the 31
// call sites that already use it keep their exact appearance: `glass` is the
// default and is byte-for-byte the original styling.
//
//   glass  — frosted, lifts on hover. The existing look.
//   solid  — flat deep-black surface, no blur, no lift. The direction the
//            Community section already uses and the one to prefer for new,
//            information-dense surfaces.
//   quiet  — solid with no hover response, for non-interactive containers.
type Variant = "glass" | "solid" | "quiet";

const SURFACE: Record<Variant, string> = {
  glass:
    "rounded-2xl border border-glass-border bg-glass-bg backdrop-blur-xl transition-colors duration-300 hover:border-azure/30 hover:shadow-[0_8px_40px_-12px_var(--glow)]",
  solid:
    "rounded-[var(--radius-md)] border border-line bg-surface-1 transition-colors duration-[var(--dur-base)] hover:border-line-strong",
  quiet: "rounded-[var(--radius-md)] border border-line bg-surface-1",
};

export default function GlassCard({
  children,
  className = "",
  variant = "glass",
  /** Lift on hover. Defaults on for `glass`, off otherwise. */
  interactive,
}: {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  interactive?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const lifts = interactive ?? variant === "glass";

  return (
    <motion.div
      whileHover={reduceMotion || !lifts ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`${SURFACE[variant]} ${className}`}
    >
      {children}
    </motion.div>
  );
}
