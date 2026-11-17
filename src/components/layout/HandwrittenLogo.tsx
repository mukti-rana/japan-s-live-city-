// "Live City" in handwriting that writes itself, forever, painted with the logo's sunset (orange, pink, dusk violet)
// and a soft pink glow: each letter is drawn in outline from left to right,
// fills in, holds for a few seconds, then un-writes in the same order and starts again. Pure SVG and CSS (see
// .hw-l in globals.css), no script. Under reduced motion it is simply the finished word. The link around it
// already has the accessible name "LIVE CITY JAPAN", so the drawing itself is hidden from screen readers.
const LETTERS = ["L", "i", "v", "e", " ", "C", "i", "t", "y"];

import { useId } from "react";

export default function HandwrittenLogo({ className = "" }: { className?: string }) {
  const gid = useId();
  const paint = `url(#${gid})`;
  let written = 0;
  return (
    <svg aria-hidden="true" viewBox="0 0 112 32" className={`h-8 w-28 overflow-visible text-foreground ${className}`} style={{ fontFamily: "var(--font-hand), cursive", fontSize: 30, filter: "drop-shadow(0 0 7px rgb(255 79 154 / 0.38))" }}>
      <defs>
        {/* The logo's sunset, across the whole word: orange, then pink, then dusk violet. */}
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="112" y2="0">
          <stop offset="0" stopColor="#ff9a3d" />
          <stop offset="0.45" stopColor="#ff4f9a" />
          <stop offset="1" stopColor="#a56bff" />
        </linearGradient>
      </defs>
      <text x="1" y="24" fill={paint} stroke={paint}>
        {LETTERS.map((ch, i) =>
          ch === " " ? (
            " "
          ) : (
            <tspan key={i} className="hw-l" style={{ "--i": written++ } as React.CSSProperties}>
              {ch}
            </tspan>
          ),
        )}
      </text>
    </svg>
  );
}
