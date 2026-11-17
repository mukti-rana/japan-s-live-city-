"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

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

// Opens a header menu when a mouse points at it and closes it a moment after the mouse leaves, so nothing has to be
// clicked. Pointing is for mice only: on touch screens (and for keyboards) the menus still open on a tap or Enter.
// A click "pins" the menu so it stays open until an outside click or Escape; clicking a pinned menu closes it.
// Put `hover` on the element that holds both the button and the panel, and use `toggle` as the button's click handler.
export function useHoverMenu(open: boolean, setOpen: (open: boolean) => void, onOpen?: () => void) {
  const pinned = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const clear = () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  useEffect(() => {
    if (!open) pinned.current = false;
  }, [open]);
  useEffect(() => clear, []);

  const hover = {
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType !== "mouse") return;
      clear();
      if (open) return;
      timer.current = window.setTimeout(() => {
        setOpen(true);
        onOpen?.();
      }, 90);
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType !== "mouse") return;
      clear();
      if (!open || pinned.current) return;
      timer.current = window.setTimeout(() => setOpen(false), 260);
    },
  };

  const toggle = useCallback(() => {
    clear();
    if (!open) {
      pinned.current = true;
      setOpen(true);
      onOpen?.();
    } else if (!pinned.current) {
      pinned.current = true; // opened by pointing: a click keeps it open
    } else {
      pinned.current = false;
      setOpen(false);
    }
  }, [open, setOpen, onOpen]);

  return { hover, toggle };
}
