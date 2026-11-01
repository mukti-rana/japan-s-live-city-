"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LogIn } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/supabase/AuthContext";
import { markWelcomeSeen, useWelcomeState } from "@/lib/welcome";

// The welcome on the home page for anyone who isn't signed in. It is the same
// full-screen entrance as the sign-in and create-account pages: Sign in,
// Create account, or Explore Japan as Guest. It is never a wall — the guest
// button and Escape both dismiss it for the rest of the browser session, it
// returns the next time the link is opened, and signed-in visitors never see
// it. Only shown when accounts are configured, so it never offers a sign-in
// that can't work.
export default function WelcomeGate() {
  const { t } = useLanguage();
  const { user, loading, configured } = useAuth();
  const welcome = useWelcomeState();
  const reduceMotion = useReducedMotion();

  const open = configured && !loading && !user && welcome === "new";

  useEffect(() => {
    if (!open) return;
    // Put the cursor on the guest button, the way out that is always available.
    document.querySelector<HTMLElement>("[data-auth-shell] [data-guest-link]")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") markWelcomeSeen();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-label="LIVE CITY JAPAN"
        >
          <AuthShell mode="welcome">
            <Link
              href="/login"
              onClick={markWelcomeSeen}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sakura to-neon-purple text-sm font-semibold text-background shadow-[0_10px_30px_-12px_rgba(255,107,157,0.6)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985]"
            >
              <LogIn size={16} />
              {t("auth.signIn")}
            </Link>
          </AuthShell>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
