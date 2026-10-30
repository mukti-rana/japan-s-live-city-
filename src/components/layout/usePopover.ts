"use client";

import { useEffect, type RefObject } from "react";

// Closes a popover on an outside press or Escape. Shared by the header's
// menus so they all behave the same way.
export function useDismiss(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, ref]);
}

// The look every header icon control shares: 36px, round, quiet until hovered.
export const ICON_BUTTON =
  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent text-muted transition-colors duration-200 hover:border-glass-border hover:bg-glass-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure aria-expanded:border-glass-border aria-expanded:bg-glass-bg aria-expanded:text-foreground";

// A dropdown panel. On phones it spans the header's width so it can never run
// off the screen.
export const MENU_PANEL =
  "z-50 rounded-2xl border border-glass-border bg-panel p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] max-sm:fixed max-sm:inset-x-3 max-sm:top-full max-sm:mt-2 sm:absolute sm:right-0 sm:top-full sm:mt-2";
