"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { motion, useAnimationControls, useInView, useReducedMotion, type Variants } from "motion/react";
import { useTranslate } from "@/lib/i18n/inline";

// A chapter's big heading, animated one letter at a time, in a row: every character is its own element and starts a little
// to the right of its place (0.6em, a share of the letter's own size, so it reads the same on a phone and on a wide screen).
// The letters then follow one another from the first to the last, each easing left into its exact position while it fades
// up, 0.045s after the one before it. Each letter's own move is one smooth ease-out (no spring, no bounce, no rotation), so
// a whole heading is done in well under two seconds.
//
// It behaves like the page's other reveals: it plays when the heading is a little inside the screen and is set up again only
// once it is completely off screen, so it replays on the way back and the reset is never seen. The text is translated first,
// then split into words (a word never breaks across lines) and letters. One visually-hidden copy of the whole heading is kept
// for screen readers, and reduced motion shows the heading in place. The server's page has the plain heading; the splitting
// only starts in the browser, so what the server draws never differs from what a reduced-motion visitor's browser draws.
const RISE = "0.6em";
const EASE = [0.16, 1, 0.3, 1] as const;

// The parent only sets the pace: the letters take their turn 0.045s apart, in reading order. Going back to hidden is instant.
const PARENT: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } };
const LETTER: Variants = {
  hidden: { x: RISE, opacity: 0, transition: { duration: 0 } },
  visible: { x: 0, opacity: 1, transition: { x: { duration: 0.85, ease: EASE }, opacity: { duration: 0.6, ease: "easeOut" } } },
};

export default function SlideInHeading({ en }: { en: string }) {
  const tr = useTranslate();
  const text = tr(en);
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const ref = useRef<HTMLSpanElement>(null);
  const entered = useInView(ref, { margin: "0px 0px -12% 0px" });
  const onScreen = useInView(ref);
  const controls = useAnimationControls();

  useEffect(() => {
    if (entered) void controls.start("visible");
    else if (!onScreen) void controls.start("hidden");
  }, [entered, onScreen, controls]);

  if (!mounted || reduce) return <span className="block">{text}</span>;
  return (
    <motion.span ref={ref} className="block" variants={PARENT} initial="hidden" animate={controls}>
      <span aria-hidden="true">
        {text.split(/(\s+)/).map((token, w) =>
          !token ? null : /^\s+$/.test(token) ? (
            <span key={w}>{token}</span>
          ) : (
            <span key={w} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
              {Array.from(token).map((ch, i) => (
                <motion.span key={i} variants={LETTER} style={{ display: "inline-block", whiteSpace: "pre" }}>
                  {ch}
                </motion.span>
              ))}
            </span>
          ),
        )}
      </span>
      <span className="sr-only">{text}</span>
    </motion.span>
  );
}
