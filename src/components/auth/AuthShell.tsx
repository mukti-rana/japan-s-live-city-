import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Heart, MapPin, TrainFront, Languages } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Reveal from "@/components/ui/Reveal";

const BENEFITS = [
  { icon: Heart, label: "Favorite cities and places" },
  { icon: TrainFront, label: "Followed train lines" },
  { icon: MapPin, label: "Saved cities" },
  { icon: Languages, label: "Your language, remembered" },
];

// Shared frame for the sign-in and create-account pages, so both feel like
// part of LIVE CITY rather than a generic form — and so a guest always has
// an obvious way back to exploring without an account.
export default function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: ReactNode;
}) {
  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col gap-5 py-4">
      <div className="pointer-events-none absolute -top-10 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-azure/25 via-neon-purple/25 to-sakura/25 blur-3xl" />

      <Reveal>
        <div className="relative flex flex-col items-center text-center">
          <Logo size={56} />
          <p className="mt-3 text-xs font-bold tracking-[0.3em] text-foreground">LIVE CITY JAPAN</p>
          <h1 className="mt-3 bg-gradient-to-r from-azure via-neon-purple to-sakura bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
            Your Japan. Your cities. Your alerts.
          </h1>
          <p className="mt-2 text-sm text-muted">
            Explore freely as a guest — an account just makes it yours.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div
          role="tablist"
          aria-label="Account"
          className="relative grid grid-cols-2 gap-1 rounded-full border border-glass-border bg-glass-bg p-1"
        >
          <Link
            href="/login"
            role="tab"
            aria-selected={mode === "login"}
            className={`rounded-full px-4 py-2 text-center text-sm font-medium transition-colors ${
              mode === "login" ? "bg-azure/20 text-azure" : "text-muted hover:text-foreground"
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            role="tab"
            aria-selected={mode === "signup"}
            className={`rounded-full px-4 py-2 text-center text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-azure/20 text-azure" : "text-muted hover:text-foreground"
            }`}
          >
            Create account
          </Link>
        </div>
      </Reveal>

      <div className="relative flex flex-col gap-4">{children}</div>

      <Reveal delay={0.2}>
        <ul className="relative flex flex-wrap justify-center gap-2">
          {BENEFITS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-bg px-3 py-1.5 text-[11px] text-foreground/80"
            >
              <Icon size={12} className="text-sakura" />
              {label}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={0.25}>
        <div className="relative text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-azure"
          >
            <ArrowLeft size={14} />
            Continue exploring as guest
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
