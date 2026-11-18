"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SplittingText } from "@animate-ui/react/primitives/texts/splitting";
import Logo from "@/components/ui/Logo";
import { HOME_PHOTOS } from "@/lib/data/homePhotos";
import type { IntroMode } from "@/lib/intro";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";

// The cinematic welcome: a pitch-black screen that slowly opens onto dark, still photographs of Japan while four short
// lines are spoken in turn, then the LIVE CITY JAPAN logo, then it fades into the real home page.
//  - Nothing of the site shows while it runs: the overlay is solid black underneath the pictures.
//  - Each line is split into its letters, and every letter slides in from the right at the same moment (no stagger, no
//    delay) while it fades up: Animate UI's SplittingText with stagger 0, on Motion. No bounce, no rotation.
//  - The photographs are Kyoto at night, Tokyo after dark and Mount Fuji at first light, graded darker and quieter and
//    drifting very slowly. If one cannot load, its scene is simply black.
//  - First visit: the full intro (about 13 seconds). Returning visits, and anyone who asks the browser for less motion:
//    a short one (about 5 seconds) with no drifting photographs. Skip intro (or Escape) is there from the first second.
const EASE = [0.16, 1, 0.3, 1] as const;

// Mount Fuji over Lake Kawaguchi: the photograph the sign-in page already uses (Wikimedia Commons, CC0), loaded from there.
const FUJI = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Fuji_Kawaguchi_475.JPG/1920px-Fuji_Kawaguchi_475.JPG";

const SCENES = [
  { src: HOME_PHOTOS.kiyomizu.src, pos: "72% 50%", remote: false }, // Kyoto at night
  { src: HOME_PHOTOS.hero.src, pos: "84% 50%", remote: false }, // Tokyo after dark
  { src: FUJI, pos: "50% 50%", remote: true }, // Mount Fuji at first light
] as const;

type Step = { kind: "gap" | "line" | "logo"; text?: string; scene: number; ms: number };

const FULL: Step[] = [
  { kind: "gap", scene: 0, ms: 1300 },
  { kind: "line", text: "Discover Japan.", scene: 0, ms: 2100 },
  { kind: "line", text: "Experience every moment.", scene: 1, ms: 2100 },
  { kind: "line", text: "Stay connected.", scene: 1, ms: 2100 },
  { kind: "line", text: "Japan is waiting.", scene: 2, ms: 2300 },
  { kind: "logo", scene: 2, ms: 2300 },
];
const SHORT: Step[] = [
  { kind: "gap", scene: 0, ms: 500 },
  { kind: "line", text: "Japan is waiting.", scene: 0, ms: 2000 },
  { kind: "logo", scene: 0, ms: 1700 },
];

const SHADE = "brightness-[0.58] saturate-[0.82] contrast-[1.06]";

export default function CinematicIntro({ mode, onDone }: { mode: IntroMode; onDone: () => void }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const short = mode === "short" || Boolean(reduced);
  const steps = short ? SHORT : FULL;
  const [i, setI] = useState(0);
  const [leave, setLeave] = useState<null | number>(null); // fade-out length in seconds once it is leaving
  const [fujiFailed, setFujiFailed] = useState(false);
  const skipRef = useRef<HTMLButtonElement>(null);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  const skip = useCallback(() => setLeave((l) => l ?? 0.7), []);

  // Move through the steps; after the last one, fade out slowly.
  useEffect(() => {
    if (leave !== null) return;
    const id = window.setTimeout(() => (i + 1 < steps.length ? setI(i + 1) : setLeave(short ? 0.9 : 1.3)), steps[i].ms);
    return () => window.clearTimeout(id);
  }, [i, leave, steps, short]);

  // Safety net: if the browser never reports the fade as finished (a hidden tab, say), still hand the page over.
  useEffect(() => {
    if (leave === null) return;
    const id = window.setTimeout(finish, leave * 1000 + 1600);
    return () => window.clearTimeout(id);
  }, [leave, finish]);

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

  const step = steps[i];
  const scene = step.scene;
  const serif = language === "ja" ? "font-jp" : "font-[family-name:var(--font-home-serif)]";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={tr("LIVE CITY JAPAN")}
      className="fixed inset-0 z-[90] overflow-hidden bg-black text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: leave === null ? 1 : 0 }}
      // Leaving: the words or logo melt away first, then the black and the photograph fade into the page behind.
      transition={{ duration: leave === null ? 0.5 : leave, delay: leave === null ? 0 : 0.4, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (leave !== null) finish();
      }}
    >
      {/* The photographs: one at a time, each fading up out of the black and drifting very slowly. */}
      {SCENES.map((s, n) => {
        if (short && n > 0) return null;
        if (s.remote && (fujiFailed || i < 1)) return null;
        const active = n === scene;
        const seen = n <= scene;
        return (
          <motion.div
            key={n}
            aria-hidden="true"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: active && step.kind !== "gap" ? 1 : active ? 0.55 : 0, scale: reduced ? 1.04 : seen ? 1.15 : 1.04 }}
            transition={{ opacity: { duration: 2, ease: "easeInOut" }, scale: { duration: 14, ease: "linear" } }}
          >
            {s.remote ? (
              // eslint-disable-next-line @next/next/no-img-element -- a remote photograph; if it cannot load the scene stays black
              <img src={s.src} alt="" decoding="async" onError={() => setFujiFailed(true)} className={`h-full w-full object-cover ${SHADE}`} style={{ objectPosition: s.pos }} />
            ) : (
              <Image src={s.src} alt="" fill sizes="100vw" quality={70} priority={n === 0} className={`object-cover ${SHADE}`} style={{ objectPosition: s.pos }} />
            )}
          </motion.div>
        );
      })}

      {/* Vignette: the picture is brightest in the middle and falls away to black at the edges, top and bottom. */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.7)_85%),linear-gradient(180deg,rgba(0,0,0,0.65),rgba(0,0,0,0.05)_30%,rgba(0,0,0,0.05)_70%,rgba(0,0,0,0.7))]" />

      <motion.div className="absolute inset-0 flex items-center justify-center px-6 text-center" animate={{ opacity: leave === null ? 1 : 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
        <p className="sr-only" aria-live="polite">
          {step.kind === "line" ? tr(step.text ?? "") : step.kind === "logo" ? "LIVE CITY JAPAN" : ""}
        </p>
        <AnimatePresence mode="wait">
          {step.kind === "line" && (
            <motion.div
              key={`line-${i}`}
              aria-hidden="true"
              exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeIn" } }}
              className={`${serif} max-w-[16ch] text-[clamp(36px,7.2vw,104px)] font-normal leading-[1.06] tracking-[-0.02em] [text-shadow:0_2px_44px_rgba(0,0,0,0.65)] sm:max-w-[22ch]`}
            >
              <SplittingText type="chars" text={tr(step.text ?? "")} stagger={0} initial={{ x: "0.5em", opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.95, ease: EASE }} />
            </motion.div>
          )}
          {step.kind === "logo" && (
            <motion.div
              key="logo"
              aria-hidden="true"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: EASE }}
              className="flex flex-col items-center gap-5"
            >
              <Logo size={84} />
              <p className="text-xs font-semibold tracking-[0.42em] text-white/90 sm:text-sm">LIVE CITY JAPAN</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {leave === null && (
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
    </motion.div>
  );
}
