"use client";

import { useSyncExternalStore } from "react";
import { SplittingText } from "@animate-ui/react/primitives/texts/splitting";
import { useTranslate } from "@/lib/i18n/inline";

// A chapter's big heading, split into letters that rise a little into place one after another (Animate UI's
// SplittingText, built on Motion). Deliberately quiet, in keeping with the pitch-black page:
//  - the rise is a fraction of the letter's own height (0.3em), so it is the same gentle motion on a phone and on a wide
//    screen, never a drop from far away;
//  - on screens wider than a phone each letter also eases out of a faint blur; on a phone it is only the rise and the
//    fade, because blurring many large letters is the costly part for a phone's graphics chip;
//  - 0.03s between letters and 0.7s each: the longest heading is done in about a second and a quarter.
// It starts when the heading scrolls into view and plays again each time it comes back, like the rest of the page. The text
// is translated first, then split; the primitive keeps one visually-hidden copy of the whole heading for screen readers and
// shows everything at once under reduced motion. Letters stay in whole words (a word never breaks across lines). The
// splitting only starts in the browser: the server's page has plain text, so what the server draws never differs from what
// a reduced-motion visitor's browser draws.
const RISE = "0.3em";
const TRANSITION = { duration: 0.7, ease: [0.22, 1, 0.36, 1] } as const;

const SMALL = "(max-width: 639px)";
const subscribeSmall = (cb: () => void) => {
  const q = window.matchMedia(SMALL);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
const isSmall = () => window.matchMedia(SMALL).matches;

export default function SplitHeading({ en }: { en: string }) {
  const tr = useTranslate();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const small = useSyncExternalStore(subscribeSmall, isSmall, () => false);
  if (!mounted) return <>{tr(en)}</>;
  return (
    <SplittingText
      key={small ? "phone" : "wide"}
      type="chars"
      text={tr(en)}
      inView
      inViewOnce={false}
      inViewMargin="0px 0px -14% 0px"
      initial={small ? { y: RISE, opacity: 0 } : { y: RISE, opacity: 0, filter: "blur(6px)" }}
      animate={small ? { y: 0, opacity: 1 } : { y: 0, opacity: 1, filter: "blur(0px)" }}
      transition={TRANSITION}
      stagger={0.03}
      delay={60}
    />
  );
}
