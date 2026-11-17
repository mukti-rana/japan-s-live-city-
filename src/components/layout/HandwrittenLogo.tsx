import { useId } from "react";

// The wordmark: "Live City" writes itself in handwriting, holds, and draws itself away; then "Explore Japan" does the
// same in the very same place, and so on forever. Each phrase is painted with the logo's sunset (orange, then pink,
// then dusk violet) across its OWN width, so the two look identical in colour, size and font, with a soft pink glow.
// Pure SVG and CSS (see .hw-a / .hw-b / .hw-l in globals.css), no script. Under reduced motion it is simply "Live City",
// finished. The link around it already has the accessible name "LIVE CITY JAPAN", so the drawing is hidden from screen
// readers.
const PHRASES = [
  { text: "Live City", width: 90, cls: "hw-a" },
  { text: "Explore Japan", width: 145, cls: "hw-b" },
] as const;
// The drawing is as wide as the longer phrase (SVG units = px at the default size).
const WIDTH = 148;

export default function HandwrittenLogo({ className = "" }: { className?: string }) {
  const id = useId();
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${WIDTH} 32`} className={`h-8 w-[148px] overflow-visible text-foreground ${className}`} style={{ fontFamily: "var(--font-hand), cursive", fontSize: 30, filter: "drop-shadow(0 0 7px rgb(255 79 154 / 0.38))" }}>
      <defs>
        {PHRASES.map((p) => (
          <linearGradient key={p.cls} id={`${id}-${p.cls}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={p.width} y2="0">
            <stop offset="0" stopColor="#ff9a3d" />
            <stop offset="0.45" stopColor="#ff4f9a" />
            <stop offset="1" stopColor="#a56bff" />
          </linearGradient>
        ))}
      </defs>
      {PHRASES.map((p) => {
        const paint = `url(#${id}-${p.cls})`;
        let written = 0;
        return (
          <text key={p.cls} className={p.cls} x="1" y="24" fill={paint} stroke={paint}>
            {p.text.split("").map((ch, i) =>
              ch === " " ? (
                " "
              ) : (
                <tspan key={i} className="hw-l" style={{ "--i": written++ } as React.CSSProperties}>
                  {ch}
                </tspan>
              ),
            )}
          </text>
        );
      })}
    </svg>
  );
}
