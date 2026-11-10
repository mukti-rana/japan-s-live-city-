import type { ReactNode } from "react";

// The card behind every Community page header: a calm dusk-over-the-mountains
// scene made only of gradients and one SVG ridge line — no photo is loaded, so
// it costs nothing and cannot show a place that is not what it claims to be.
// Purely decorative (hidden from screen readers); it moves very slowly and
// stands still for visitors who ask for less motion.
export default function CommunityHero({ children }: { children: ReactNode }) {
  return (
    <header className="relative isolate overflow-hidden rounded-3xl border border-glass-border bg-[linear-gradient(135deg,#17163a_0%,#1d1a45_45%,#2a1a3f_100%)] p-5 shadow-[0_20px_60px_-30px_rgba(168,85,247,0.55)] sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="cm-wash-a absolute -left-1/4 -top-1/2 h-[120%] w-3/4 rounded-full bg-sakura/25 blur-3xl" />
        <div className="cm-wash-b absolute -right-1/4 -top-1/3 h-[110%] w-3/4 rounded-full bg-azure/25 blur-3xl" />
        {/* The sun, low and soft. */}
        <div className="absolute bottom-6 right-[14%] h-16 w-16 rounded-full bg-gradient-to-b from-sakura/70 to-gold/40 opacity-70 blur-[2px] sm:h-24 sm:w-24" />
        {/* Layered ridge lines, a little wider than the card so they can sway. */}
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="cm-ridge absolute -bottom-px -left-[3%] h-24 w-[106%] sm:h-32">
          <path d="M0 140 L120 95 L210 125 L330 70 L430 120 L540 85 L650 130 L760 60 L860 118 L980 90 L1090 125 L1200 100 L1200 200 L0 200 Z" fill="rgba(11,14,26,0.45)" />
          <path d="M0 170 L90 140 L200 160 L330 120 L470 160 L600 130 L720 165 L860 128 L990 160 L1100 140 L1200 158 L1200 200 L0 200 Z" fill="rgba(11,14,26,0.8)" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
      </div>
      {children}
    </header>
  );
}
