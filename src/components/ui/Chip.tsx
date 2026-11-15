"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

// Interactive pill: filters, category toggles, quick picks.
// For a static label use Badge instead — a Badge is not clickable and should
// not look like it is.
//
// Selected state is carried by aria-pressed as well as colour, so it is not
// communicated by colour alone.
export default function Chip({
  selected = false,
  children,
  className = "",
  ...rest
}: {
  selected?: boolean;
  children: ReactNode;
} & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:pointer-events-none disabled:opacity-45 ${
        selected
          ? "border-accent/50 bg-accent/15 text-accent"
          : "border-line bg-surface-2 text-text-secondary hover:border-line-strong hover:text-text-primary"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
