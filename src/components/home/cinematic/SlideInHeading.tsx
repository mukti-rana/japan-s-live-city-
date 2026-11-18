"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { motion, useAnimationControls, useInView, useReducedMotion } from "motion/react";

// A chapter's big heading, as one piece: when it scrolls into view the whole heading (every letter together, no
// stagger) glides in from the right to its own place on the left while it fades up, then rests. The font, size, spacing
// and alignment are the heading's own; only its position and opacity move. The motion is one smooth ease-out (no
// spring, no bounce, no rotation) over under a second, and the distance is a share of the screen width (12vw), so it is
// the same proportion on a phone and on a wide screen.
//
// It behaves like the page's other reveals: it plays when the heading is a little inside the screen and is set up again
// only once it is completely off screen, so it replays on the way back and the reset is never seen. Reduced motion shows
// the heading in place. The server's page has the plain heading; the motion only starts in the browser, so what the
// server draws never differs from what a reduced-motion visitor's browser draws.
const FROM = { x: "12vw", opacity: 0 };
const TO = { x: 0, opacity: 1 };
const EASE = [0.16, 1, 0.3, 1] as const;
const TRANSITION = { x: { duration: 0.95, ease: EASE }, opacity: { duration: 0.65, ease: "easeOut" } } as const;

export default function SlideInHeading({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const ref = useRef<HTMLSpanElement>(null);
  const entered = useInView(ref, { margin: "0px 0px -12% 0px" });
  const onScreen = useInView(ref);
  const controls = useAnimationControls();

  useEffect(() => {
    if (entered) void controls.start(TO, TRANSITION);
    else if (!onScreen) void controls.start(FROM, { duration: 0 });
  }, [entered, onScreen, controls]);

  if (!mounted || reduce) return <span className="block">{children}</span>;
  return (
    <motion.span
      ref={ref}
      className="block"
      initial={FROM}
      animate={controls}
    >
      {children}
    </motion.span>
  );
}
