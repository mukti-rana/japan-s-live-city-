"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SplittingText } from "@animate-ui/react/primitives/texts/splitting";
import Logo from "@/components/ui/Logo";
import { HOME_PHOTOS } from "@/lib/data/homePhotos";
import { revealPage, settleHeaderLogo } from "@/lib/intro";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";

// The cinematic welcome, in four beats:
//   1. A pitch-black screen opens onto a dark photograph of Kyoto at night.
//   2. "Welcome to Japan." — every letter slides in from the right at the same moment (Animate UI SplittingText, stagger 0).
//   3. The words and the photograph fade away into complete black, and the LIVE CITY JAPAN logo is drawn large, stroke by
//      stroke, the way the top bar draws it, on that pitch-black screen.
//   4. The finished logo flies up to the logo in the top bar and settles exactly on it, while the black fades away and the
//      home page arrives (the page's own entrance is in cinematic.css). The top-bar logo is hidden until the flying one
//      lands, then shown, so the two are one.
// Nothing of the site shows while it runs: the overlay is solid black underneath the picture. If the photograph cannot load,
// that scene is simply black. Skip intro is offered while the words are on screen (and Escape skips at any time); it goes
// straight to the fade of step 4. Anyone who asks the browser for less motion gets no drifting photograph and no flight: the
// logo is drawn already finished and the overlay just fades into the page.
const EASE = [0.16, 1, 0.3, 1] as const;

const SCENE = { src: HOME_PHOTOS.kiyomizu.src, pos: "72% 50%" }; // Kyoto at night

type Step = { kind: "gap" | "words" | "logo"; ms: number };
const STEPS: Step[] = [
  { kind: "gap", ms: 1000 },
  { kind: "words", ms: 2600 },
  { kind: "logo", ms: 4000 },
];

const SHADE = "brightness-[0.58] saturate-[0.82] contrast-[1.06]";
const FLY = 1.25; // seconds the logo takes to fly to the top bar

type Phase = "play" | "fly" | "fade";

export default function CinematicIntro({ onDone }: { onDone: () => void }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("play");
  const [fadeSecs, setFadeSecs] = useState(0.9);
  const [flight, setFlight] = useState({ x: 0, y: 0, s: 1 });
  const logoRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const done = useRef(false);

  // The intro is over: show the top-bar logo (matching the one that landed) and hand the page over.
  const land = useCallback(() => {
    if (done.current) return;
    done.current = true;
    settleHeaderLogo();
    onDone();
  }, [onDone]);

  const fade = useCallback((secs: number) => {
    revealPage();
    setFadeSecs(secs);
    setPhase((p) => (p === "play" ? "fade" : p));
  }, []);

  // Fly the logo from where it is to where the top-bar logo is; if that logo can't be found, just fade.
  const fly = useCallback(() => {
    const from = logoRef.current?.getBoundingClientRect();
    const to = document.querySelector('[data-site-header] a[aria-label="LIVE CITY JAPAN"] > span')?.getBoundingClientRect();
    if (reduced || !from || !to || to.width === 0) return fade(0.9);
    setFlight({ x: to.left + to.width / 2 - (from.left + from.width / 2), y: to.top + to.height / 2 - (from.top + from.height / 2), s: to.width / from.width });
    revealPage();
    setPhase("fly");
  }, [fade, reduced]);

  const skip = useCallback(() => fade(0.7), [fade]);

  // Move through the beats; after the last one, the logo flies.
  useEffect(() => {
    if (phase !== "play") return;
    const id = window.setTimeout(() => (i + 1 < STEPS.length ? setI(i + 1) : fly()), STEPS[i].ms);
    return () => window.clearTimeout(id);
  }, [i, phase, fly]);

  // Safety net: if the browser never reports the fade as finished (a hidden tab, say), still hand the page over.
  useEffect(() => {
    if (phase === "play") return;
    const id = window.setTimeout(land, (phase === "fly" ? FLY + 0.4 : fadeSecs) * 1000 + 1500);
    return () => window.clearTimeout(id);
  }, [phase, fadeSecs, land]);

  // The page behind stays put, the keyboard lands on Skip, and Escape skips.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    skipRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [skip]);

  const step = STEPS[i];
  const words = tr("Welcome to Japan.");
  const serif = language === "ja" ? "font-jp" : "font-[family-name:var(--font-home-serif)]";
  const playing = phase === "play";

  return (
    <div role="dialog" aria-modal="true" aria-label={tr("LIVE CITY JAPAN")} className={`keep-dark-ink fixed inset-0 z-[90] ${playing ? "" : "pointer-events-none"}`} style={{ color: "#fff" }}>
      {/* The black and the photographs: fade up out of the dark at the start, and away when the page arrives. */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        style={{ backgroundColor: "#000" }} // not bg-black: the site turns black to ink in the light theme, and this must be black in both
        initial={{ opacity: 0 }}
        animate={{ opacity: playing ? 1 : 0 }}
        transition={playing ? { duration: 0.5, ease: "easeInOut" } : { duration: phase === "fly" ? FLY : fadeSecs, delay: phase === "fly" ? 0.1 : 0, ease: "easeInOut" }}
        onAnimationComplete={() => {
          if (!playing) land();
        }}
      >
        {/* The photograph fades up out of the black for the words, and back into complete black before the logo is drawn. */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: step.kind === "words" ? 1 : step.kind === "gap" ? 0.55 : 0, scale: reduced ? 1.04 : 1.15 }}
          transition={{ opacity: { duration: step.kind === "logo" ? 1.1 : 2, ease: "easeInOut" }, scale: { duration: 14, ease: "linear" } }}
        >
          <Image src={SCENE.src} alt="" fill sizes="100vw" quality={70} priority className={`object-cover ${SHADE}`} style={{ objectPosition: SCENE.pos }} />
        </motion.div>
        {/* Vignette: brightest in the middle, falling away to black at the edges, top and bottom. */}
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.7)_85%),linear-gradient(180deg,rgba(0,0,0,0.65),rgba(0,0,0,0.05)_30%,rgba(0,0,0,0.05)_70%,rgba(0,0,0,0.7))]" />
      </motion.div>

      {/* The words, then the logo (which is what flies). */}
      <motion.div className="absolute inset-0 flex items-center justify-center px-6 text-center" animate={{ opacity: phase === "fade" ? 0 : 1 }} transition={{ duration: 0.45, ease: "easeOut" }}>
        <p className="sr-only" aria-live="polite">
          {step.kind === "words" ? words : step.kind === "logo" ? "LIVE CITY JAPAN" : ""}
        </p>
        <AnimatePresence mode="wait">
          {step.kind !== "logo" && (
            <motion.div
              key="words"
              aria-hidden="true"
              exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeIn" } }}
              className={`${serif} mx-auto max-w-[min(92vw,1100px)] text-[clamp(46px,8.4vw,120px)] font-normal leading-[1.08] tracking-[-0.02em] [text-shadow:0_2px_44px_rgba(0,0,0,0.7)]`}
            >
              {step.kind === "words" && <SplittingText type="chars" text={words} stagger={0} initial={{ x: "0.5em", opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1.05, ease: EASE }} />}
              {step.kind === "gap" && <span className="invisible block">{words}</span>}
            </motion.div>
          )}
          {step.kind === "logo" && (
            <motion.div key="logo" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              {/* Drawn once, large; then it travels (a curved path: the sideways and upward moves ease differently) and shrinks onto the top-bar logo. */}
              <motion.div
                ref={logoRef}
                className="h-[clamp(240px,42vmin,460px)] w-[clamp(240px,42vmin,460px)] [&>svg]:h-full [&>svg]:w-full"
                animate={phase === "fly" ? { x: flight.x, y: flight.y, scale: flight.s } : { x: 0, y: 0, scale: 1 }}
                transition={{ x: { duration: FLY, ease: [0.35, 0, 0.15, 1] }, y: { duration: FLY, ease: [0.75, 0, 0.3, 1] }, scale: { duration: FLY, ease: [0.5, 0, 0.2, 1] } }}
              >
                <Logo size={460} drawing="once" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {playing && step.kind !== "logo" && (
        <motion.button
          ref={skipRef}
          type="button"
          onClick={skip}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-4 text-[11px] font-medium uppercase tracking-[0.22em] text-white/55 transition-colors duration-300 hover:border-white/40 hover:text-white focus-visible:border-white/50 focus-visible:text-white focus-visible:outline-none sm:right-8"
        >
          {tr("Skip intro")}
          <span aria-hidden="true">→</span>
        </motion.button>
      )}
    </div>
  );
}
