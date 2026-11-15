"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";

// Accessible dialog. The app currently has ~17 hand-rolled role="dialog"
// blocks and two of them are missing aria-modal; this gets the behaviour right
// once:
//
//   - aria-modal + labelled by its own title
//   - focus moves in on open and returns to the opener on close
//   - Tab is kept inside the dialog
//   - Escape and backdrop click close it
//   - background scroll is locked while open
//   - entrance respects prefers-reduced-motion
//
// On small screens it sits at the bottom as a sheet, which is easier to reach
// one-handed; from `sm` up it centres.
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  /** English title text; translated through the shared memory. */
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const tr = useTranslate();
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Move focus to the panel itself rather than the close button, so the
    // first thing a screen reader announces is the dialog's own title.
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  const width = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full ${width} rounded-t-[var(--radius-lg)] border border-line bg-surface-1 outline-none sm:rounded-[var(--radius-lg)]`}
          >
            <div className="flex items-start gap-3 border-b border-line p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-base font-semibold tracking-tight text-text-primary sm:text-lg">
                  {tr(title)}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-text-secondary">
                    {tr(description)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={tr("Close")}
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5">{children}</div>

            {footer && <div className="border-t border-line p-4 sm:p-5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
