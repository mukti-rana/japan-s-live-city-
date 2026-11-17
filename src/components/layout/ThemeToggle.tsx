"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { ICON_BUTTON } from "@/components/layout/usePopover";
import { THEME_KEY, storedTheme, type Theme } from "@/lib/theme/theme";
import { useTranslate } from "@/lib/i18n/inline";

// The header's Sun/Moon button (Magic UI's animated theme toggler). The page's
// real theme is the "dark" class on <html>; this just reads it, so there is one
// source of truth (set before first paint by the script in layout.tsx).
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const read = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

// `className` restyles the button (the sidebar uses its own item look); `labelClassName` shows the label as text
// beside the icon, styled by it (otherwise the label is for screen readers only).
export default function ThemeToggle({ className, labelClassName }: { className?: string; labelClassName?: string } = {}) {
  const tr = useTranslate();
  const reduce = useReducedMotion();
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);

  // The theme the page should be showing: the saved choice, otherwise dark unless the
  // device asks for light. It is re-applied if anything resets <html>'s class (for
  // example React re-mounting the root on a "page not found"), and when the device
  // setting changes while there is no saved choice.
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const enforce = () => {
      const want: Theme = storedTheme() ?? (mq.matches ? "light" : "dark");
      if (want === "dark" && !root.classList.contains("dark")) root.classList.add("dark");
      else if (want === "light" && root.classList.contains("dark")) root.classList.remove("dark");
    };
    enforce();
    const observer = new MutationObserver(enforce);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    mq.addEventListener("change", enforce);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", enforce);
    };
  }, []);

  // Choosing a theme saves it, so it is still there on the next visit.
  const remember = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage can be blocked (private window); the choice then lasts for this visit.
    }
  }, []);

  const label = theme === "dark" ? tr("Switch to light mode") : tr("Switch to dark mode");
  return (
    <AnimatedThemeToggler
      theme={theme}
      onThemeChange={remember}
      duration={reduce ? 1 : 450}
      aria-label={label}
      title={label}
      label={labelClassName ? <span className={labelClassName}>{label}</span> : undefined}
      className={className ?? `${ICON_BUTTON} [&>svg]:h-[18px] [&>svg]:w-[18px]`}
    />
  );
}
