"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { SplittingText } from "@animate-ui/react/primitives/texts/splitting";
import Logo from "@/components/ui/Logo";
import { HOME_PHOTOS } from "@/lib/data/homePhotos";
import { revealPage, settleHeaderLogo } from "@/lib/intro";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";

// The cinematic welcome, in five beats:
//   1. A pitch-black screen opens onto a dark photograph of Kyoto at night.
//   2. "Welcome to Japan." — the letters rise out of a blur one after another with a little depth (Animate UI SplittingText),
//      lit by a soft warm bloom behind them while the camera pushes in very slightly.
//   3. The expansion: the letters turn to windows onto the black beyond and the whole line rushes toward the viewer, growing
//      until one letter's stroke fills the screen (the way the X app's logo opens) and the photograph is gone.
//   4. On the pitch-black screen that remains, the LIVE CITY JAPAN logo is drawn large, stroke by stroke, the way the top bar
//      draws it. (The logo and its drawing are untouched by the expansion; they start the moment it ends.)
//   5. The finished logo flies up to the logo in the top bar and settles exactly on it, while the black fades away and the
//      home page arrives (the page's own entrance is in cinematic.css). The top-bar logo is hidden until the flying one
//      lands, then shown, so the two are one.
// Nothing of the site shows while it runs: the overlay is solid black underneath the picture. If the photograph cannot load,
// that scene is simply black. There is no on-screen button: Escape skips at any time, going
// straight to the fade of step 4. Anyone who asks the browser for less motion gets no drifting photograph and no flight: the
// logo is drawn already finished and the overlay just fades into the page.
const EASE = [0.16, 1, 0.3, 1] as const;

const SCENE = { src: HOME_PHOTOS.kiyomizu.src, pos: "72% 50%" }; // Kyoto at night

type Step = { kind: "gap" | "words" | "zoom" | "logo"; ms: number };
const STEPS: Step[] = [
  { kind: "gap", ms: 900 },
  { kind: "words", ms: 3300 }, // the reveal (about 2.2s), then a held beat
  { kind: "zoom", ms: 2100 }, // the expansion (ZOOM_SECS) plus a breath of black
  { kind: "logo", ms: 4000 },
];
const ZOOM_SECS = 2;

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
  // The expansion: progress 0..1, and how far the line has to grow (set from the screen and the type size when it starts).
  // The growth is exponential in progress, so it feels like a steady rush toward the viewer rather than a late burst.
  const zoomP = useMotionValue(0);
  const zoomTo = useMotionValue(90);
  const zoomScale = useTransform([zoomP, zoomTo], ([p, to]: number[]) => Math.exp(Math.log(to) * p));
  const [origin, setOrigin] = useState("50% 50%");
  const wordsRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
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

  // Under reduced motion there is no expansion: the words just give way to the logo.
  const steps = reduced ? STEPS.filter((x) => x.kind !== "zoom") : STEPS;

  // Move through the beats; after the last one, the logo flies.
  useEffect(() => {
    if (phase !== "play") return;
    const id = window.setTimeout(() => (i + 1 < steps.length ? setI(i + 1) : fly()), steps[i].ms);
    return () => window.clearTimeout(id);
  }, [i, phase, fly, steps]);

  // The expansion starts: aim it at the stem of a letter (a thick, solid part, so the screen ends up filled by one stroke),
  // work out how far it has to grow for that stroke to cover the screen, and rush toward it.
  const zooming = steps[i].kind === "zoom";
  useEffect(() => {
    if (!zooming) return;
    const box = wordsRef.current;
    if (box) {
      const r = box.getBoundingClientRect();
      const letters = Array.from(box.querySelectorAll<HTMLElement>('[data-slot="splitting-text"] > span[aria-hidden] span > span'));
      const stem = letters.find((el) => /^[lIiTt|]$/.test(el.textContent ?? ""));
      const font = parseFloat(getComputedStyle(box).fontSize) || 80;
      if (stem && r.width > 0) {
        const c = stem.getBoundingClientRect();
        setOrigin(`${(((c.left + c.width / 2) - r.left) / r.width) * 100}% ${(((c.top + c.height / 2) - r.top) / r.height) * 100}%`);
        zoomTo.set(Math.min(260, Math.max(40, (Math.max(window.innerWidth, window.innerHeight) * 0.62) / (font * 0.085))));
      } else zoomTo.set(Math.min(260, Math.max(60, (Math.max(window.innerWidth, window.innerHeight) * 0.9) / (font * 0.085))));
    }
    const run = animate(zoomP, 1, { duration: ZOOM_SECS, ease: [0.5, 0, 0.2, 1] });
    return () => run.stop();
  }, [zooming, zoomP, zoomTo]);

  // Safety net: if the browser never reports the fade as finished (a hidden tab, say), still hand the page over.
  useEffect(() => {
    if (phase === "play") return;
    const id = window.setTimeout(land, (phase === "fly" ? FLY + 0.4 : fadeSecs) * 1000 + 1500);
    return () => window.clearTimeout(id);
  }, [phase, fadeSecs, land]);

  // The page behind stays put, the keyboard stays on the intro (so Tab cannot wander into the hidden page), and Escape skips.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    rootRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [skip]);

  const step = steps[i];
  const words = tr("Welcome to Japan.");
  const serif = language === "ja" ? "font-jp" : "font-[family-name:var(--font-home-serif)]";
  const playing = phase === "play";

  return (
    <div ref={rootRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={tr("LIVE CITY JAPAN")} className={`keep-dark-ink fixed inset-0 z-[90] outline-none ${playing ? "" : "pointer-events-none"}`} style={{ color: "#fff" }}>
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
          transition={{ opacity: step.kind === "zoom" ? { duration: 0.7, delay: ZOOM_SECS * 0.62, ease: "easeIn" } : { duration: step.kind === "logo" ? 1.1 : 2, ease: "easeInOut" }, scale: { duration: 14, ease: "linear" } }}
        >
          <Image src={SCENE.src} alt="" fill sizes="100vw" quality={70} priority className={`object-cover ${SHADE}`} style={{ objectPosition: SCENE.pos }} />
        </motion.div>
        {/* Vignette: brightest in the middle, falling away to black at the edges, top and bottom. */}
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.7)_85%),linear-gradient(180deg,rgba(0,0,0,0.65),rgba(0,0,0,0.05)_30%,rgba(0,0,0,0.05)_70%,rgba(0,0,0,0.7))]" />
      </motion.div>

      {/* The words, then the logo (which is what flies). */}
      <motion.div className="absolute inset-0 flex items-center justify-center px-6 text-center" animate={{ opacity: phase === "fade" ? 0 : 1 }} transition={{ duration: 0.45, ease: "easeOut" }}>
        <p className="sr-only" aria-live="polite">
          {step.kind === "words" || step.kind === "zoom" ? words : step.kind === "logo" ? "LIVE CITY JAPAN" : ""}
        </p>
        <AnimatePresence mode="wait">
          {step.kind !== "logo" && (
            <motion.div
              key="words"
              aria-hidden="true"
              // Leaving after the expansion is instant (the screen is already black); leaving any other way is a short fade.
              exit={{ opacity: 0, transition: { duration: step.kind === "zoom" ? 0.01 : 0.55, ease: "easeIn" } }}
              className="relative mx-auto max-w-[min(92vw,1100px)]"
            >
              {/* A soft warm bloom behind the words (amber into pink into violet, the wordmark's colours); it clears as the expansion starts. */}
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[230%] w-[135%] -translate-x-1/2 -translate-y-1/2"
                style={{ background: "radial-gradient(closest-side, rgba(255,176,86,0.2), rgba(255,95,160,0.1) 48%, rgba(165,107,255,0.05) 72%, transparent)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: step.kind === "words" ? 1 : 0 }}
                transition={{ duration: step.kind === "zoom" ? 0.5 : 2.6, ease: "easeOut" }}
              />
              {/* The camera pushes in a hair while the words are on screen. */}
              <motion.div animate={{ scale: step.kind === "gap" ? 1 : 1.04 }} transition={{ duration: 6, ease: "easeOut" }}>
                <motion.div
                  ref={wordsRef}
                  style={{ scale: zoomScale, transformOrigin: origin, perspective: 900 }}
                  className={`${serif} ${step.kind === "zoom" ? "intro-ink" : ""} text-[clamp(46px,8.4vw,120px)] font-normal leading-[1.08] tracking-[-0.02em] [text-shadow:0_0_38px_rgba(255,190,140,0.28),0_2px_44px_rgba(0,0,0,0.7)]`}
                >
                  {(step.kind === "words" || step.kind === "zoom") && (
                    <SplittingText type="chars" text={words} stagger={0.055} initial={{ y: "0.38em", opacity: 0, filter: "blur(14px)", rotateX: -55 }} animate={{ y: 0, opacity: 1, filter: "blur(0px)", rotateX: 0 }} transition={{ duration: 1.35, ease: EASE }} />
                  )}
                  {step.kind === "gap" && <span className="invisible block">{words}</span>}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
          {step.kind === "logo" && (
            <motion.div key="logo" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              {/* Drawn once, large; then it travels (a curved path: the sideways and upward moves ease differently) and shrinks onto the top-bar logo. */}
              <motion.div
                ref={logoRef}
                className="h-[clamp(260px,68vmin,760px)] w-[clamp(260px,68vmin,760px)] [&>svg]:h-full [&>svg]:w-full"
                animate={phase === "fly" ? { x: flight.x, y: flight.y, scale: flight.s } : { x: 0, y: 0, scale: 1 }}
                transition={{ x: { duration: FLY, ease: [0.35, 0, 0.15, 1] }, y: { duration: FLY, ease: [0.75, 0, 0.3, 1] }, scale: { duration: FLY, ease: [0.5, 0, 0.2, 1] } }}
              >
                <Logo size={460} drawing="once" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
