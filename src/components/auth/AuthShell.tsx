import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight, Compass } from "lucide-react";
import Logo from "@/components/ui/Logo";
import GuestLink from "@/components/auth/GuestLink";
import AuthPreview from "@/components/auth/AuthPreview";
import Reveal from "@/components/ui/Reveal";

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to pick up where you left off.",
    otherHref: "/signup",
    otherLabel: "Create account",
  },
  signup: {
    title: "Create your account",
    subtitle: "Free, and it takes a minute.",
    otherHref: "/login",
    otherLabel: "Already have an account? Sign in",
  },
} as const;

// Full-screen entrance for the sign-in and create-account pages. It covers
// the app chrome (sidebar, top bar) on purpose — this is the front door, not
// another dashboard page — and always leaves the guest route one click away.
//
// Children are the page's own notices and form (ending in the primary
// button); the shell adds the guest and secondary actions beneath, so the
// three actions always appear in the same order with the same size.
export default function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: ReactNode;
}) {
  const copy = COPY[mode];

  return (
    <div data-auth-shell className="fixed inset-0 z-[70] overflow-y-auto bg-background">
      <div className="relative isolate min-h-full overflow-hidden">
        {/* Cinematic night-city backdrop: a banner on small screens, the left
            panel on large ones, always faded into the page background. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_35%,transparent)] lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[60%] lg:[mask-image:linear-gradient(to_right,black_50%,transparent)]"
        >
          <Image
            src="/images/place-dotonbori-canal.jpg"
            alt=""
            fill
            preload
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="auth-zoom object-cover [object-position:50%_62%]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0e1a]/70 via-[#1b1140]/45 to-[#0b0e1a]/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e1a] via-[#0b0e1a]/50 to-transparent lg:via-[#0b0e1a]/30" />
        </div>

        {/* Slow ambient lighting. Decorative only — never intercepts clicks. */}
        <div
          aria-hidden="true"
          className="auth-drift-a pointer-events-none absolute -left-24 top-10 -z-10 h-80 w-80 rounded-full bg-neon-purple/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="auth-drift-b pointer-events-none absolute -right-20 bottom-0 -z-10 h-96 w-96 rounded-full bg-azure/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="auth-drift-b pointer-events-none absolute left-1/3 top-1/2 -z-10 h-64 w-64 rounded-full bg-sakura/15 blur-3xl"
        />

        <div className="mx-auto grid min-h-full w-full max-w-[1600px] grid-cols-1 gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:grid-rows-[1fr_auto] lg:gap-x-12 lg:gap-y-8 lg:px-12 lg:py-10 xl:px-16">
          {/* Brand + headline */}
          <header className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1 lg:justify-between lg:gap-10">
            <Reveal>
              <div className="flex items-center gap-3">
                <Logo size={44} />
                <p className="text-xs font-bold tracking-[0.3em] text-foreground sm:text-sm">LIVE CITY JAPAN</p>
              </div>
            </Reveal>

            <Reveal delay={0.08} className="max-w-xl lg:mb-auto lg:mt-auto">
              <h1 className="auth-sheen bg-gradient-to-r from-sakura via-neon-purple to-azure bg-clip-text pb-1 text-5xl font-bold tracking-tight text-transparent sm:text-6xl lg:text-7xl">
                JAPAN, LIVE.
              </h1>
              <p className="mt-3 text-lg font-medium text-foreground sm:text-xl">
                Your Japan. Your cities. Your adventures.
              </p>
              <p className="mt-3 hidden max-w-md text-sm leading-relaxed text-foreground/85 sm:block sm:text-base">
                Discover Japan through live weather, train updates, interactive maps, local events, Japanese culture,
                and hidden destinations.
              </p>
            </Reveal>
          </header>

          {/* Authentication panel */}
          <div className="flex items-start justify-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:items-center">
            <Reveal delay={0.12} className="w-full max-w-md">
              <section
                aria-labelledby="auth-title"
                className="relative rounded-3xl border border-white/10 bg-panel/75 p-5 shadow-[0_30px_80px_-30px_rgba(168,85,247,0.45)] backdrop-blur-xl sm:p-7"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-neon-purple/70 to-transparent"
                />

                <h2 id="auth-title" className="text-xl font-semibold tracking-tight text-foreground">
                  {copy.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{copy.subtitle}</p>

                <div className="mt-5 flex flex-col gap-4">{children}</div>

                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <GuestLink label="Explore Japan as Guest" className="auth-guest-glow group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-azure/60 bg-gradient-to-r from-azure/10 to-neon-purple/15 text-sm font-semibold text-foreground transition-all hover:border-neon-purple/70 hover:from-azure/20 hover:to-neon-purple/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985]">
                      <Compass size={17} className="text-azure transition-transform duration-500 group-hover:rotate-45" />
                      <span>
                        Explore Japan as Guest{" "}
                        <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </span>
                    </GuestLink>
                    <p className="mt-2 text-center text-xs text-foreground/70">
                      No account required. Start exploring Japan.
                    </p>
                  </div>

                  <Link
                    href={copy.otherHref}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-glass-border bg-glass-bg text-sm font-medium text-foreground/90 transition-colors hover:border-white/25 hover:bg-glass-bg-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985]"
                  >
                    {copy.otherLabel}
                    <ArrowRight size={14} className="text-muted" />
                  </Link>
                </div>

                <p className="mt-5 text-center text-xs leading-relaxed text-muted">
                  Explore freely. Create an account whenever you&apos;re ready to save your favorite places and
                  personalize your experience.
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
