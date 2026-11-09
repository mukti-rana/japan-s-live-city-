"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Compass, LogIn, UserPlus } from "lucide-react";
import Logo from "@/components/ui/Logo";
import GuestLink from "@/components/auth/GuestLink";
import AuthPreview from "@/components/auth/AuthPreview";
import Reveal from "@/components/ui/Reveal";
import { useTranslate } from "@/lib/i18n/inline";

export type AuthView = "welcome" | "signin" | "signup";

const PETALS = Array.from({ length: 9 }, (_, i) => ({ x: (i * 43 + 7) % 100, delay: -((i * 2.7) % 16), dur: 16 + ((i * 3) % 7), size: 7 + ((i * 5) % 6), dx: ((i * 19) % 60) - 30 }));

// A quiet, lightweight atmosphere over the photograph: slow clouds, a soft
// shimmer on the water in the lower part, a few petals. Decorative only; it
// stops when the tab is hidden and for visitors who ask for less motion
// (the photograph itself stays).
function Atmosphere() {
  return (
    <div aria-hidden="true" className="atm-root atm-anim pointer-events-none absolute inset-0 overflow-hidden">
      <span className="auth-cloud absolute -left-[10%] top-[8%] h-24 w-[55%] rounded-full bg-white/[0.07] blur-3xl" style={{ animationDuration: "70s" }} />
      <span className="auth-cloud absolute left-[30%] top-[20%] h-20 w-[50%] rounded-full bg-white/[0.06] blur-3xl" style={{ animationDuration: "95s", animationDelay: "-30s" }} />
      <span className="auth-shimmer absolute inset-x-0 bottom-0 h-[38%] mix-blend-screen" />
      {PETALS.map((p, i) => (
        <span key={i} className="atm-fall absolute top-0 block" style={{ left: `${p.x}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ["--dx" as string]: `${p.dx}px` }}>
          <span className="atm-sway atm-petal block h-full w-full opacity-70" style={{ animationDuration: `${4 + (i % 4)}s`, animationDelay: `${p.delay}s` }} />
        </span>
      ))}
    </div>
  );
}

// Full-screen entrance for the welcome page, sign-in and create-account. It
// opens guest-first: Explore Japan as Guest is the main button, with Sign in
// and Create account beside it. The sign-in and create-account forms open in
// place (with a way back) and are the real forms, passed in by the page. It
// covers the app chrome on purpose — this is the front door, not another
// dashboard page — and the guest route is always one click away.
export default function AuthShell({ initialView = "welcome", signIn, signUp }: { initialView?: AuthView; signIn: ReactNode; signUp: ReactNode }) {
  const tr = useTranslate();
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

  const copy = {
    welcome: { title: "Welcome", subtitle: "Explore Japan right away, or sign in to save your favorites." },
    signin: { title: "Welcome back", subtitle: "Sign in to pick up where you left off." },
    signup: { title: "Create your account", subtitle: "Free, and it takes a minute." },
  }[view];

  const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const secondary = `flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] text-sm font-medium text-foreground transition-colors hover:border-white/30 hover:bg-white/10 active:scale-[0.985] ${ring}`;

  return (
    <div data-auth-shell className="fixed inset-0 z-[70] overflow-y-auto bg-background">
      <div className="relative isolate min-h-full overflow-hidden">
        {/* The photograph: a banner on small screens, the left panel on large
            ones, always faded into the page background. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_35%,transparent)] lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[60%] lg:[mask-image:linear-gradient(to_right,black_50%,transparent)]"
        >
          <Image src="/images/place-dotonbori-canal.jpg" alt="" fill preload sizes="(min-width: 1024px) 60vw, 100vw" className="auth-zoom object-cover [object-position:50%_62%]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0e1a]/70 via-[#1b1140]/45 to-[#0b0e1a]/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e1a] via-[#0b0e1a]/50 to-transparent lg:via-[#0b0e1a]/30" />
          <Atmosphere />
        </div>

        {/* Slow ambient lighting. Decorative only — never intercepts clicks. */}
        <div aria-hidden="true" className="auth-drift-a pointer-events-none absolute -left-24 top-10 -z-10 h-80 w-80 rounded-full bg-neon-purple/25 blur-3xl" />
        <div aria-hidden="true" className="auth-drift-b pointer-events-none absolute -right-20 bottom-0 -z-10 h-96 w-96 rounded-full bg-azure/15 blur-3xl" />
        <div aria-hidden="true" className="auth-drift-b pointer-events-none absolute left-1/3 top-1/2 -z-10 h-64 w-64 rounded-full bg-sakura/15 blur-3xl" />

        <div className="mx-auto grid min-h-full w-full max-w-[1600px] grid-cols-1 gap-6 px-5 py-6 sm:px-8 md:gap-8 lg:grid-cols-[1.1fr_1fr] lg:grid-rows-[1fr_auto] lg:gap-x-12 lg:gap-y-8 lg:px-12 lg:py-10 xl:px-16">
          {/* Brand + headline */}
          <header className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1 lg:justify-between lg:gap-10">
            <Reveal>
              <div className="flex items-center gap-3">
                <Logo size={44} />
                <p className="text-xs font-bold tracking-[0.3em] text-foreground sm:text-sm">LIVE CITY JAPAN</p>
              </div>
            </Reveal>

            <Reveal delay={0.08} className="max-w-xl lg:mb-auto lg:mt-auto">
              <h1 className="auth-sheen bg-gradient-to-r from-sakura via-neon-purple to-azure bg-clip-text pb-1 text-5xl font-bold tracking-tight text-transparent sm:text-6xl lg:text-7xl">{tr("JAPAN, LIVE.")}</h1>
              <p className="mt-3 text-lg font-medium text-foreground sm:text-xl">{tr("Your Japan. Your cities. Your adventures.")}</p>
              <p className="mt-3 hidden max-w-md text-sm leading-relaxed text-foreground/85 sm:block sm:text-base">
                {tr("Discover Japan through live weather, train updates, interactive maps, local events, Japanese culture, and hidden destinations.")}
              </p>
            </Reveal>
          </header>

          {/* The panel: welcome, sign in or create account */}
          <div className="flex items-start justify-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:items-center">
            <Reveal delay={0.12} className="w-full max-w-md">
              <section aria-labelledby="auth-title" className="relative rounded-3xl border border-white/10 bg-panel/60 p-5 shadow-[0_30px_80px_-30px_rgba(168,85,247,0.45)] backdrop-blur-xl sm:p-7">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-neon-purple/70 to-transparent" />

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={view}
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
                  >
                    {view !== "welcome" && (
                      <button type="button" onClick={() => setView("welcome")} className={`mb-3 flex items-center gap-1.5 rounded-lg text-xs font-medium text-foreground/70 transition-colors hover:text-foreground ${ring}`}>
                        <ArrowLeft size={14} aria-hidden="true" />
                        {tr("Back to welcome")}
                      </button>
                    )}

                    <h2 id="auth-title" ref={titleRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground outline-none">
                      {tr(copy.title)}
                    </h2>
                    <p className="mt-1 text-sm text-foreground/75">{tr(copy.subtitle)}</p>

                    {view === "welcome" && (
                      <div className="mt-5 flex flex-col gap-3">
                        <div>
                          <GuestLink
                            label="Explore Japan as Guest"
                            className={`auth-guest-glow group flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-azure to-neon-purple text-base font-semibold text-white shadow-[0_12px_34px_-12px_rgba(124,92,255,0.8)] transition-all hover:brightness-110 active:scale-[0.985] ${ring}`}
                          >
                            <Compass size={18} className="transition-transform duration-500 group-hover:rotate-45" aria-hidden="true" />
                            <span>
                              {tr("Explore Japan as Guest")}{" "}
                              <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
                                →
                              </span>
                            </span>
                          </GuestLink>
                          <p className="mt-2 text-center text-xs text-foreground/75">{tr("No account required. Start exploring Japan.")}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setView("signin")} className={secondary}>
                            <LogIn size={15} aria-hidden="true" />
                            {tr("Sign in")}
                          </button>
                          <button type="button" onClick={() => setView("signup")} className={secondary}>
                            <UserPlus size={15} aria-hidden="true" />
                            {tr("Create account")}
                          </button>
                        </div>
                      </div>
                    )}

                    {view === "signin" && <div className="mt-5 flex flex-col gap-4">{signIn}</div>}
                    {view === "signup" && <div className="mt-5 flex flex-col gap-4">{signUp}</div>}

                    {view !== "welcome" && (
                      <div className="mt-4 flex flex-col gap-2.5">
                        <button type="button" onClick={() => setView(view === "signin" ? "signup" : "signin")} className={secondary}>
                          {view === "signin" ? tr("Create account") : tr("Already have an account? Sign in")}
                          <ArrowRight size={14} className="text-muted" aria-hidden="true" />
                        </button>
                        <GuestLink label="Explore Japan as Guest" className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-azure transition-colors hover:bg-azure/10 ${ring}`}>
                          <Compass size={15} aria-hidden="true" />
                          {tr("Explore Japan as Guest")}
                        </GuestLink>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <p className="mt-5 text-center text-xs leading-relaxed text-foreground/65">
                  {tr("Explore freely. Create an account whenever you're ready to save your favorite places and personalize your experience.")}
                </p>
              </section>
            </Reveal>
          </div>

          {/* Compact look at what's inside */}
          <Reveal delay={0.2} className="lg:col-start-1 lg:row-start-2">
            <AuthPreview />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
