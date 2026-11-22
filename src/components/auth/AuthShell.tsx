"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Playfair_Display } from "next/font/google";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import Logo from "@/components/ui/Logo";
import ShineBorder from "@/components/ui/ShineBorder";
import GuestLink from "@/components/auth/GuestLink";
import FujiBackdrop from "@/components/auth/FujiBackdrop";
import AuthLanguageMenu from "@/components/auth/AuthLanguageMenu";
import { useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// The elegant serif for the page heading (Latin text only; Japanese uses the
// app's Japanese font, other scripts fall back to the system serif).
const display = Playfair_Display({ subsets: ["latin"], weight: ["500", "600"], display: "swap" });

export type AuthView = "signin" | "signup";

// The front door: sign in, or create an account. Full screen, over Mount Fuji
// at dusk, with the language choice top right and one floating panel.
//
// The panel leads with "Explore Japan as Guest" (a plain link to the site — no
// account and no pretend session), then a divider, then the real sign-in form,
// visible without any extra click. Create account opens the real sign-up form
// in the same panel. Both forms are passed in by the page and use the same
// server actions as ever. It covers the app chrome on purpose.
export default function AuthShell({ initialView = "signin", signIn, signUp }: { initialView?: AuthView; signIn: ReactNode; signUp: ReactNode }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const [view, setView] = useState<AuthView>(initialView);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // When the view changes, move the keyboard to the new screen's heading once
  // it has appeared (the old screen is still leaving for a moment).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => titleRef.current?.focus(), reduced ? 30 : 340);
    return () => window.clearTimeout(id);
  }, [view, reduced]);

  const signingIn = view === "signin";
  const heading = `${language === "ja" ? "font-jp" : display.className} text-4xl font-semibold leading-tight tracking-tight text-foreground outline-none sm:text-[2.6rem]`;
  const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
  const textLink = `rounded font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white ${ring}`;

  return (
    <div data-auth-shell className="keep-dark-ink fixed inset-0 z-[70] overflow-y-auto bg-background">
      <div className="relative isolate flex min-h-full flex-col">
        <FujiBackdrop />

        <header className="pointer-events-none flex items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <div className="pointer-events-auto flex items-center gap-2.5">
            <Logo size={36} />
            <p className="text-xs font-bold tracking-[0.28em] text-foreground [text-shadow:0_1px_3px_rgba(0,0,0,0.8),0_0_14px_rgba(0,0,0,0.55)]">LIVE CITY JAPAN</p>
          </div>
          <div className="pointer-events-auto">
            <AuthLanguageMenu />
          </div>
        </header>

        <main className="pointer-events-none flex flex-1 items-start justify-center px-4 pb-14 pt-[20vh] sm:items-center sm:pt-0 lg:justify-end lg:pr-[7vw] xl:pr-[10vw]">
          <section aria-labelledby="auth-title" className="auth-panel pointer-events-auto relative w-full max-w-[26rem] rounded-[1.75rem] border border-white/[0.14] p-6 shadow-[0_32px_80px_-30px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.07)] [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] sm:p-8">
            <ShineBorder colors={["#6f6a62", "#a39c90", "#6f6a62"]} width={1} duration={9} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
              >
                {signingIn ? (
                  <>
                    <div className="text-center">
                      <h1 id="auth-title" ref={titleRef} tabIndex={-1} className={heading}>
                        {tr("Welcome")}
                      </h1>
                      <p className="mt-2 text-sm text-foreground">{tr("Your journey through Japan starts here.")}</p>
                    </div>

                    <div className="mt-6">
                      {/* Minimal glass: transparent, a fine light border, the same width as the panel's own controls; the arrow slides on hover, focus and tap. */}
                      <GuestLink label="Explore Japan as Guest" className={`auth-guest group ${ring}`}>
                        <Compass size={17} className="auth-guest__icon" aria-hidden="true" />
                        <span className="auth-guest__label">{tr("Explore Japan as Guest")}</span>
                        <ArrowRight size={17} className="auth-guest__arrow" aria-hidden="true" />
                      </GuestLink>
                      <p className="mt-2 text-center text-xs text-foreground">{tr("No account required. Start exploring Japan.")}</p>
                    </div>

                    <div role="separator" className="my-5 flex items-center gap-3">
                      <span aria-hidden="true" className="h-px flex-1 bg-white/[0.14]" />
                      <span className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">{tr("Or sign in to your account")}</span>
                      <span aria-hidden="true" className="h-px flex-1 bg-white/[0.14]" />
                    </div>

                    <div className="flex flex-col gap-3">{signIn}</div>

                    <p className="mt-5 text-center text-sm text-foreground">
                      {tr("Don't have an account?")}{" "}
                      <button type="button" onClick={() => setView("signup")} className={textLink}>
                        {tr("Create account")}
                      </button>
                    </p>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setView("signin")} className={`mb-4 flex items-center gap-1.5 text-xs font-medium text-foreground transition-colors hover:text-foreground ${ring} rounded-lg`}>
                      <ArrowLeft size={14} aria-hidden="true" />
                      {tr("Back to sign in")}
                    </button>
                    <h1 id="auth-title" ref={titleRef} tabIndex={-1} className={heading}>
                      {tr("Create your account")}
                    </h1>
                    <p className="mt-2 text-sm text-foreground">{tr("Free, and it takes a minute.")}</p>

                    <div className="mt-6 flex flex-col gap-3">{signUp}</div>

                    <p className="mt-5 text-center text-sm text-foreground">
                      {tr("Already have an account?")}{" "}
                      <button type="button" onClick={() => setView("signin")} className={textLink}>
                        {tr("Sign in")}
                      </button>
                    </p>
                    <GuestLink label="Explore Japan as Guest" className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-white/90 transition-colors hover:bg-white/[0.07] ${ring}`}>
                      <Compass size={15} aria-hidden="true" />
                      <span className="auth-guest__label">{tr("Explore Japan as Guest")}</span>
                    </GuestLink>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </main>
      </div>
    </div>
  );
}
