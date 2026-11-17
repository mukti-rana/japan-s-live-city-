"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

// One or more short messages, typed out in the same spot, typed out one character at a time with a blinking caret, held for
// a moment, then (when there is more than one) deleted backwards before the next one is typed; a single message stays on screen once typed (see .typed-msg in globals.css for the colour and the
// plain monospace letters, which are easy to read in any language). It is only text: nothing here is clickable. Under
// reduced motion it shows the first message, still. A screen reader gets the full text once, not the typing.
export default function TypedPrompt({ messages, finale }: { messages: readonly string[]; finale?: string }) {
  const reduce = useReducedMotion();
  const [which, setWhich] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<"type" | "hold" | "erase">("type");

  const first = messages[0] ?? "";
  const letters = Array.from(messages[which % messages.length] ?? "");

  useEffect(() => {
    if (reduce) return;
    let id: number;
    if (phase === "type") {
      if (count < letters.length) id = window.setTimeout(() => setCount((c) => c + 1), count === 0 ? 350 : 48);
      else id = window.setTimeout(() => setPhase("hold"), 0);
    } else if (phase === "hold") {
      if (messages.length < 2) return; // a single message stays once it is typed
      id = window.setTimeout(() => setPhase("erase"), 2600);
    } else if (count > 0) {
      id = window.setTimeout(() => setCount((c) => c - 1), 22);
    } else {
      id = window.setTimeout(() => {
        setWhich((w) => (w + 1) % messages.length);
        setPhase("type");
      }, 300);
    }
    return () => window.clearTimeout(id);
  }, [phase, count, letters.length, reduce, messages.length]);

  const shown = reduce ? Array.from(first).join("") : letters.slice(0, count).join("");
  // The finale (an emoji) pops in when the line is complete; it keeps its own colours outside the gradient text.
  const complete = reduce || (count === letters.length && phase !== "erase");
  return (
    <p className="min-h-[3.4rem] text-[13px] leading-[1.5]">
      <span className="sr-only">{`${messages.join(" ")}${finale ? ` ${finale}` : ""}`}</span>
      <span aria-hidden="true">
        <span className="typed-msg">
          {shown}
          {!reduce && <span className="typed-caret" />}
        </span>
        {finale && complete && <span className="typed-finale">{finale}</span>}
      </span>
    </p>
  );
}
