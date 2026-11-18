import { useId } from "react";

// "Live City Japan" in the same handwriting and sunset colours as the top bar's wordmark, but written a single time, letter
// after letter, and left finished (see .hw-once in globals.css). `delay` (seconds) is when the pen starts. Under reduced
// motion it is simply the finished word. It is decoration beside the logo; the real name is on the dialog.
const LETTERS = "Live City Japan".split("");

export default function WrittenWordmark({ delay = 0, className = "" }: { delay?: number; className?: string }) {
  const gid = useId();
  let written = 0;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 142 36"
      className={`hw-once h-auto overflow-visible ${className}`}
      style={{ fontFamily: "var(--font-hand), cursive", fontSize: 30, filter: "drop-shadow(0 0 8px rgb(255 79 154 / 0.35))", ["--base" as string]: `${delay}s` }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff9a3d" />
          <stop offset="0.45" stopColor="#ff4f9a" />
          <stop offset="1" stopColor="#a56bff" />
        </linearGradient>
      </defs>
      <text x="1" y="27" fill={`url(#${gid})`} stroke={`url(#${gid})`}>
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
