"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AccountPromptValue {
  // Opens the friendly "make it yours" card. Never blocks anything — the
  // guest can dismiss it and keep browsing.
  requestAccount: () => void;
}

const AccountPromptContext = createContext<AccountPromptValue>({ requestAccount: () => {} });

export function AccountPromptProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const primaryRef = useRef<HTMLAnchorElement>(null);

  const requestAccount = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AccountPromptContext.Provider value={{ requestAccount }}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-prompt-title"
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-glass-border bg-panel p-6 shadow-[0_20px_60px_-20px_rgba(168,85,247,0.45)]"
              initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-azure/40 via-neon-purple/40 to-sakura/40 blur-3xl" />
              <div className="relative flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-azure via-neon-purple to-sakura text-white">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 id="account-prompt-title" className="text-lg font-semibold tracking-tight text-foreground">
                    {t("account.promptTitle")}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("account.promptBody")}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    ref={primaryRef}
                    href="/signup"
                    onClick={close}
                    className="flex items-center justify-center rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                  >
                    {t("account.createFree")}
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:text-foreground"
                  >
                    {t("account.notNow")}
                  </button>
                </div>
                <p className="text-center text-xs text-muted">
                  <Link href="/login" onClick={close} className="text-azure hover:underline">
                    {t("auth.signIn")}
                  </Link>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AccountPromptContext.Provider>
  );
}

export function useAccountPrompt(): AccountPromptValue {
  return useContext(AccountPromptContext);
}
