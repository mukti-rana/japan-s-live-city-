"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { JLPT_LEVELS } from "@/lib/quiz/jlptQuestions";

export default function LevelTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1.5">
      {JLPT_LEVELS.map(({ level, label }) => {
        const href = `/jlpt/${level}`;
        const active = pathname === href;
        return (
          <Link
            key={level}
            href={href}
            className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              active ? "text-background" : "text-muted hover:text-foreground"
            }`}
          >
            {active && (
              <motion.span
                layoutId="jlpt-level-pill"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-sakura to-gold"
              />
            )}
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
