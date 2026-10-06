"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

// Eases the displayed number from its previous value to the new one, so a
// temperature change reads as a smooth tween instead of a jump. Reduced-motion
// users get the value immediately.
export default function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (reduceMotion) return;
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 700, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);

  return <span className={className}>{reduceMotion ? value : display}</span>;
}
