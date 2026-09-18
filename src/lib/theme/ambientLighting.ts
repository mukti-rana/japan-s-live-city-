"use client";

import { useEffect } from "react";
import { timeOfDayPhase, type TimeOfDayPhase } from "@/lib/weather/time";

const AMBIENT_VALUES: Record<TimeOfDayPhase, { primary: string; secondary: string; glow: string }> = {
  morning: { primary: "#4da3ff", secondary: "#22d3ee", glow: "rgba(77, 163, 255, 0.35)" },
  afternoon: { primary: "#60b6ff", secondary: "#22d3ee", glow: "rgba(96, 182, 255, 0.4)" },
  sunset: { primary: "#f2c572", secondary: "#ff6b9d", glow: "rgba(242, 153, 74, 0.4)" },
  night: { primary: "#a855f7", secondary: "#22d3ee", glow: "rgba(168, 85, 247, 0.35)" },
};

// Sets --ambient-primary/--ambient-secondary/--ambient-glow on <html> from
// the local JST time of day, re-checked hourly. Purely a subtle accent for
// the hero and homepage cards' glow — never touches the core design
// tokens (background/foreground/panel/etc.).
export function useAmbientLighting() {
  useEffect(() => {
    function apply() {
      const values = AMBIENT_VALUES[timeOfDayPhase()];
      const root = document.documentElement.style;
      root.setProperty("--ambient-primary", values.primary);
      root.setProperty("--ambient-secondary", values.secondary);
      root.setProperty("--ambient-glow", values.glow);
    }

    apply();
    const interval = setInterval(apply, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}
