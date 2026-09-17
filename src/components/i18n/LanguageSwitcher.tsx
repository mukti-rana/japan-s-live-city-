"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGES } from "@/lib/i18n/languages";

export default function LanguageSwitcher({ variant }: { variant: "topbar" | "settings" }) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Portals need document.body, unavailable during SSR — this flips true
    // only after mount, one frame after the SSR-safe initial render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (variant === "settings") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LANGUAGES.map((lang) => {
          const active = lang.code === language;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "border-azure/40 bg-azure/10 text-foreground"
                  : "border-glass-border bg-glass-bg text-muted hover:text-foreground"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="min-w-0 truncate">{lang.label}</span>
              {active && <Check size={14} className="ml-auto shrink-0 text-azure" />}
            </button>
          );
        })}
      </div>
    );
  }

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("languageSwitcher.label")}
        className="hidden h-9 items-center gap-1.5 rounded-full border border-glass-border bg-glass-bg px-3 text-xs font-medium text-muted transition-colors hover:text-foreground sm:flex"
      >
        <Globe size={14} />
        <span>
          {current.flag} {current.code.toUpperCase()}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("languageSwitcher.label")}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground sm:hidden"
      >
        <Globe size={17} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="absolute right-0 top-full z-50 mt-2 hidden w-56 rounded-2xl border border-glass-border bg-glass-bg-strong p-2 shadow-xl backdrop-blur-xl sm:block"
          >
            {LANGUAGES.map((lang) => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    active ? "bg-azure/10 text-foreground" : "text-muted hover:bg-glass-bg hover:text-foreground"
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="min-w-0 flex-1 truncate text-left">{lang.label}</span>
                  {active && <Check size={14} className="shrink-0 text-azure" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet — portaled to <body> so `position: fixed` resolves
          against the real viewport, not TopBar's backdrop-blur (which the CSS
          spec makes a containing block for fixed descendants otherwise). */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.button
                  type="button"
                  aria-label={t("nav.closeMenu")}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 340, damping: 34 }}
                  className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-glass-border bg-sidebar-bg/98 p-4 backdrop-blur-xl sm:hidden"
                  style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
                >
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-glass-border" />
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    {t("languageSwitcher.mobileTitle")}
                  </p>
                  <div className="flex flex-col gap-1">
                    {LANGUAGES.map((lang) => {
                      const active = lang.code === language;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code);
                            setOpen(false);
                          }}
                          className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                            active ? "bg-azure/10 text-foreground" : "text-muted hover:bg-glass-bg hover:text-foreground"
                          }`}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span className="min-w-0 flex-1 truncate text-left">{lang.label}</span>
                          {active && <Check size={16} className="shrink-0 text-azure" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
