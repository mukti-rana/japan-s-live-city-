"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

// Two short messages that take turns in the same spot, typed out one character at a time with a blinking caret, held for
// a moment, then deleted backwards before the next one is typed (see .typed-msg in globals.css for the colour and the
// plain monospace letters, which are easy to read in any language). It is only text: nothing here is clickable. Under
// reduced motion it shows the first message, still. A screen reader gets the full text once, not the typing.
export default function TypedPrompt({ first, second }: { first: string; second: string }) {
  const reduce = useReducedMotion();
  const [which, setWhich] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<"type" | "hold" | "erase">("type");

  const letters = Array.from(which === 0 ? first : second);

  useEffect(() => {
    if (reduce) return;
    let id: number;
    if (phase === "type") {
      if (count < letters.length) id = window.setTimeout(() => setCount((c) => c + 1), count === 0 ? 350 : 48);
      else id = window.setTimeout(() => setPhase("hold"), 0);
    } else if (phase === "hold") {
      id = window.setTimeout(() => setPhase("erase"), 2600);
    } else if (count > 0) {
      id = window.setTimeout(() => setCount((c) => c - 1), 22);
    } else {
      id = window.setTimeout(() => {
        setWhich((w) => 1 - w);
        setPhase("type");
      }, 300);
    }
    return () => window.clearTimeout(id);
  }, [phase, count, letters.length, reduce]);

  const shown = reduce ? Array.from(first).join("") : letters.slice(0, count).join("");
  return (
    <p className="min-h-[2.75rem]">
      <span className="sr-only">{`${first} ${second}`}</span>
      <span aria-hidden="true" className="typed-msg block">
        {shown}
        {!reduce && <span className="typed-caret" />}
      </span>
    </p>
  );
}
