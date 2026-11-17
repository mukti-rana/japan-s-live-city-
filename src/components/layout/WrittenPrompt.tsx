"use client";

import { useEffect, useId, useRef, useState } from "react";

// Two short messages that take turns in the same spot, each writing itself in handwriting (the same effect and the
// same orange-pink-violet paint as the wordmark in the top bar: see .hw-a / .hw-b / .hw-l in globals.css), holding,
// and drawing itself away before the other begins. It is only text: nothing here is clickable. Under reduced motion
// it shows the first message, finished and still. The messages are measured once they are on screen so that any
// language fits, and the drawing scales down (never up) to the width it is given.
export default function WrittenPrompt({ first, second }: { first: string; second: string }) {
  const id = useId();
  const a = useRef<SVGTextElement>(null);
  const b = useRef<SVGTextElement>(null);
  const [width, setWidth] = useState<[number, number]>([260, 190]);

  useEffect(() => {
    const measure = () => {
      if (a.current && b.current) setWidth([Math.ceil(a.current.getComputedTextLength()) + 6, Math.ceil(b.current.getComputedTextLength()) + 6]);
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, [first, second]);

  const box = Math.max(width[0], width[1]);
  // One tspan per letter (staggered by position), so each phrase writes from left to right.
  const letters = (text: string) => {
    let written = 0;
    return text.split("").map((ch, i) =>
      ch === " " ? (
        " "
      ) : (
        <tspan key={i} className="hw-l" style={{ "--i": written++, "--step": "0.04s" } as React.CSSProperties}>
          {ch}
        </tspan>
      ),
    );
  };

  return (
    <svg
      aria-label={`${first} ${second}`}
      role="img"
      viewBox={`0 0 ${box} 34`}
      width={box}
      height={34}
      className="block h-auto max-w-full overflow-visible"
      style={{ fontFamily: "var(--font-hand), cursive", fontSize: 24 }}
    >
      <defs>
        <linearGradient id={`${id}-a`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width[0]} y2="0">
          <stop offset="0" stopColor="#ff9a3d" />
          <stop offset="0.45" stopColor="#ff4f9a" />
          <stop offset="1" stopColor="#a56bff" />
        </linearGradient>
        <linearGradient id={`${id}-b`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width[1]} y2="0">
          <stop offset="0" stopColor="#ff9a3d" />
          <stop offset="0.45" stopColor="#ff4f9a" />
          <stop offset="1" stopColor="#a56bff" />
        </linearGradient>
      </defs>
      <text ref={a} className="hw-a" x="1" y="24" fill={`url(#${id}-a)`} stroke={`url(#${id}-a)`} aria-hidden="true">
        {letters(first)}
      </text>
      <text ref={b} className="hw-b" x="1" y="24" fill={`url(#${id}-b)`} stroke={`url(#${id}-b)`} aria-hidden="true">
        {letters(second)}
      </text>
    </svg>
  );
}
