"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";

export default function Tabs({ tabs }: { tabs: string[] }) {
  const [active, setActive] = useState(tabs[0]);
  const groupId = useId();

  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setActive(tab)}
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
          <span className="relative">{tab}</span>
        </button>
      ))}
    </div>
  );
}
