"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";

export default function Tabs({
  tabs,
  value,
  onChange,
  getLabel,
}: {
  tabs: string[];
  value?: string;
  onChange?: (tab: string) => void;
  // Lets callers key tabs by a stable, locale-independent id while
  // displaying a translated label — without this, a tab's identity and its
  // on-screen text are the same string, which breaks selection state
  // across a language switch for any tab whose label is translated.
  getLabel?: (tab: string) => string;
}) {
  const [internalActive, setInternalActive] = useState(tabs[0]);
  const groupId = useId();

  const active = value ?? internalActive;

  function selectTab(tab: string) {
    if (onChange) {
      onChange(tab);
    } else {
      setInternalActive(tab);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => selectTab(tab)}
          className={`relative rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            active === tab ? "text-azure" : "text-muted hover:text-foreground"
          }`}
        >
          {active === tab && (
            <motion.span
              layoutId={`tab-pill-${groupId}`}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="absolute inset-0 rounded-lg bg-azure/20"
            />
          )}
          <span className="relative">{getLabel ? getLabel(tab) : tab}</span>
        </button>
      ))}
    </div>
  );
}
