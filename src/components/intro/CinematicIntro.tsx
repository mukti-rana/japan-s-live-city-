"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SplittingText } from "@animate-ui/react/primitives/texts/splitting";
import { TypingText, TypingTextCursor } from "@animate-ui/react/primitives/texts/typing";
import Logo from "@/components/ui/Logo";
import WrittenWordmark from "@/components/intro/WrittenWordmark";
import { HOME_PHOTOS } from "@/lib/data/homePhotos";
import type { IntroMode } from "@/lib/intro";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";

// The cinematic welcome: a pitch-black screen that slowly opens onto dark, still photographs of Japan. Four lines gather on
// screen one after another and stay together, each arriving in its own way (Animate UI text primitives on Motion):
//   Discover Japan.            letters rise out of a blur one after another (a cascade, SplittingText by characters)
//   Experience every moment.   words settle out of a soft zoom and blur (SplittingText by words)
//   Stay connected.            typed out with a blinking caret (TypingText)
//   Welcome to Japan.          the largest line: every letter slides in from the right at the same moment (stagger 0)
// Then the words melt away and the LIVE CITY JAPAN logo is drawn large, stroke by stroke, the way the top bar draws it, with
// the name written beneath it in handwriting; then everything fades into the real home page.
//  - Nothing of the site shows while it runs: the overlay is solid black underneath the pictures.
//  - The photographs are Kyoto at night, Tokyo after dark and Mount Fuji at first light, graded darker and quieter and
//    drifting very slowly. If one cannot load, its scene is simply black.
//  - A new visit: the full intro. A reload in the same session, and anyone who asks the browser for less motion: a short
//    one (just "Welcome to Japan." and the logo) with no drifting photographs. Skip intro (or Escape) is there from the
//    first second.
const EASE = [0.16, 1, 0.3, 1] as const;

// Mount Fuji over Lake Kawaguchi: the photograph the sign-in page already uses (Wikimedia Commons, CC0), loaded from there.
const FUJI = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Fuji_Kawaguchi_475.JPG/1920px-Fuji_Kawaguchi_475.JPG";

const SCENES = [
  { src: HOME_PHOTOS.kiyomizu.src, pos: "72% 50%", remote: false }, // Kyoto at night
  { src: HOME_PHOTOS.hero.src, pos: "84% 50%", remote: false }, // Tokyo after dark
  { src: FUJI, pos: "50% 50%", remote: true }, // Mount Fuji at first light
] as const;

// `n` is how many of the four lines are on screen during a "lines" step (they stay once they have arrived); `only` shows
// just the last line (the short version).
type Step = { kind: "gap" | "lines" | "logo"; n?: number; only?: boolean; scene: number; ms: number };

const FULL: Step[] = [
  { kind: "gap", scene: 0, ms: 1000 },
  { kind: "lines", n: 1, scene: 0, ms: 1250 },
  { kind: "lines", n: 2, scene: 0, ms: 1350 },
  { kind: "lines", n: 3, scene: 1, ms: 1500 },
  { kind: "lines", n: 4, scene: 2, ms: 2900 },
  { kind: "logo", scene: 2, ms: 4900 },
];
const SHORT: Step[] = [
  { kind: "gap", scene: 0, ms: 500 },
  { kind: "lines", n: 4, only: true, scene: 0, ms: 2100 },
  { kind: "logo", scene: 0, ms: 4300 },
];

const SHADE = "brightness-[0.58] saturate-[0.82] contrast-[1.06]";

// One line of the poem. Until it arrives, an invisible copy holds its place, so lines arriving never push the ones above
// them; then the animated text takes that place in the normal flow (so it wraps like any text).
function Line({ text, shown, big = false, children }: { text: string; shown: boolean; big?: boolean; children: React.ReactNode }) {
  return (
    <div className={`${big ? "mt-[clamp(10px,2.4vh,26px)] text-[clamp(42px,7.4vw,108px)]" : "text-[clamp(28px,4.3vw,62px)]"} leading-[1.1] tracking-[-0.02em]`}>
      {shown ? (
        <div>{children}</div>
      ) : (
        <span aria-hidden="true" className="invisible block">
          {text}
        </span>
      )}
    </div>
  );
}

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
  const n = step.kind === "lines" ? (step.n ?? 0) : 0; // how many of the four lines are on screen
  const lineTexts = [tr("Discover Japan."), tr("Experience every moment."), tr("Stay connected."), tr("Welcome to Japan.")];
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
          {step.kind === "lines" ? lineTexts.filter((_, n) => (step.only ? n === 3 : n < (step.n ?? 0))).join(" ") : step.kind === "logo" ? "LIVE CITY JAPAN" : ""}
        </p>
        <AnimatePresence mode="wait">
          {step.kind !== "logo" && (
            <motion.div
              key="poem"
              aria-hidden="true"
              exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeIn" } }}
              className={`${serif} mx-auto flex w-full max-w-[min(92vw,1100px)] flex-col items-center font-normal [text-shadow:0_2px_44px_rgba(0,0,0,0.7)]`}
            >
              {!step.only && (
                <Line text={lineTexts[0]} shown={n >= 1}>
                  <SplittingText type="chars" text={lineTexts[0]} stagger={0.045} initial={{ opacity: 0, y: "0.4em", filter: "blur(14px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.95, ease: EASE }} />
                </Line>
              )}
              {!step.only && (
                <Line text={lineTexts[1]} shown={n >= 2}>
                  <SplittingText type="words" text={lineTexts[1]} stagger={0.2} initial={{ opacity: 0, scale: 1.35, filter: "blur(12px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 1.05, ease: EASE }} />
                </Line>
              )}
              {!step.only && (
                <Line text={lineTexts[2]} shown={n >= 3}>
                  <TypingText text={lineTexts[2]} duration={75}>
                    <TypingTextCursor style={{ height: "0.85em", width: "2px", marginLeft: "0.12em", transform: "translateY(0.08em)" }} />
                  </TypingText>
                </Line>
              )}
              <Line text={lineTexts[3]} shown={n >= 4} big>
                <SplittingText type="chars" text={lineTexts[3]} stagger={0} initial={{ x: "0.5em", opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1.05, ease: EASE }} />
              </Line>
            </motion.div>
          )}
          {step.kind === "logo" && (
            <motion.div
              key="logo"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-[clamp(8px,2vh,22px)]"
            >
              <div className="h-[clamp(160px,27vmin,290px)] w-[clamp(160px,27vmin,290px)] [&>svg]:h-full [&>svg]:w-full">
                <Logo size={290} drawing="once" />
              </div>
              <WrittenWordmark delay={1.1} className="w-[clamp(220px,36vmin,440px)]" />
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
