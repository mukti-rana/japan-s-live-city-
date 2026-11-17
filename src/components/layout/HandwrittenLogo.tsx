// "Live City" in handwriting that writes itself, forever: each letter is drawn in outline from left to right,
// fills in, holds for a few seconds, then un-writes in the same order and starts again. Pure SVG and CSS (see
// .hw-l in globals.css), no script. Under reduced motion it is simply the finished word. The link around it
// already has the accessible name "LIVE CITY JAPAN", so the drawing itself is hidden from screen readers.
const LETTERS = ["L", "i", "v", "e", " ", "C", "i", "t", "y"];

export default function HandwrittenLogo({ className = "" }: { className?: string }) {
  let written = 0;
  return (
    <svg aria-hidden="true" viewBox="0 0 112 32" className={`h-8 w-28 overflow-visible text-foreground ${className}`} style={{ fontFamily: "var(--font-hand), cursive", fontSize: 30 }}>
      <text x="1" y="24" fill="currentColor">
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
