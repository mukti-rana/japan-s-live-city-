"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/supabase/AuthContext";
import { markWelcomeSeen, useWelcomeState } from "@/lib/welcome";

// Welcome on the home page for anyone who isn't signed in: sign in, create an
// account, or carry on as a guest. It is never a wall — "Continue as guest"
// and Escape both dismiss it for the rest of the browser session, it returns
// the next time the link is opened, and signed-in visitors never see it.
// Only shown when accounts are actually configured, so it never offers a
// sign-in that can't work.
export default function WelcomeGate() {
  const { t } = useLanguage();
  const { user, loading, configured } = useAuth();
  const welcome = useWelcomeState();
  const reduceMotion = useReducedMotion();
  const guestRef = useRef<HTMLButtonElement>(null);

  const open = configured && !loading && !user && welcome === "new";

  useEffect(() => {
    if (!open) return;
    guestRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") markWelcomeSeen();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-background p-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-[28rem] max-w-full -translate-x-1/2 rounded-full bg-gradient-to-br from-azure/25 via-neon-purple/25 to-sakura/25 blur-3xl" />

          <motion.div
            className="relative flex w-full max-w-sm flex-col items-center text-center"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo size={72} />
            <p className="mt-4 text-xs font-bold tracking-[0.3em] text-foreground">LIVE CITY JAPAN</p>
            <h1
              id="welcome-title"
              className="mt-4 bg-gradient-to-r from-azure via-neon-purple to-sakura bg-clip-text text-3xl font-semibold tracking-tight text-transparent"
            >
              {t("welcome.title")}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t("welcome.subtitle")}</p>

            <div className="mt-8 flex w-full flex-col gap-2.5">
              <Link
                href="/login"
                onClick={markWelcomeSeen}
                className="flex items-center justify-center rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                {t("auth.signIn")}
              </Link>
              <Link
                href="/signup"
                onClick={markWelcomeSeen}
                className="flex items-center justify-center rounded-xl border border-glass-border bg-glass-bg px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-azure/40"
              >
                {t("auth.createAccount")}
              </Link>
              <button
                ref={guestRef}
                type="button"
                onClick={markWelcomeSeen}
                className="mt-2 flex items-center justify-center gap-1.5 py-2 text-sm text-muted transition-colors hover:text-azure"
              >
                {t("auth.continueGuest")}
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
