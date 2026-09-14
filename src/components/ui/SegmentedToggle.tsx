"use client";

import { useId } from "react";
import { motion } from "motion/react";

export default function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const groupId = useId();

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-glass-border bg-glass-bg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative rounded-lg py-2 text-sm font-medium transition-colors ${
            value === option.value
              ? "text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          {value === option.value && (
            <motion.span
              layoutId={`segmented-${groupId}`}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-sakura to-gold"
            />
          )}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
