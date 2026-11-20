"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import Tx from "@/components/i18n/Tx";
import { useTranslate } from "@/lib/i18n/inline";

// Where the dock is not wanted: the places that are already a form or a single post, where a floating button would cover the work.
const HIDDEN = /^\/community\/(new|admin|post\/|question\/|place\/|u\/|questions\/new)/;

// The signature of the Community: a camera that is also a "plus". The lens is a ring with a spark of light, the body is drawn in a gradient
// (amber to pink to violet), and a small plus sits where the flash would be. Drawn here, not taken from an icon set, so it is only ever this.
function CameraPlus({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" width="22" height="22" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="cm-cp" x1="3" y1="24" x2="25" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <path d="M4.5 10.5a2.5 2.5 0 0 1 2.5-2.5h1.6l1.1-1.7A2 2 0 0 1 11.4 5.4h3.2" stroke="url(#cm-cp)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 10.5V21a2.5 2.5 0 0 0 2.5 2.5h14A2.5 2.5 0 0 0 23.5 21v-5" stroke="url(#cm-cp)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="16" r="4.1" stroke="url(#cm-cp)" strokeWidth="1.8" />
      <circle cx="14" cy="16" r="1.4" fill="#ffffff" opacity="0.9" />
      {/* The plus, with a little spark at its heart. */}
      <g className="cm-create-spark">
        <path d="M21 3.2v5.6M18.2 6h5.6" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// The Community's Create button, floating at the foot of the screen. Fully transparent: no fill, the page shows through; a hairline edge; a single short comet of amber, pink and
// violet light circles that edge (the rest of the edge stays a quiet grey), nothing glows outside it. The label carries a soft shadow so it reads over any photograph. The icon sits in a small gradient disc and
// tilts a little when the button is pointed at, a soft sheen crosses it, and the button lifts; pressing it settles it back. It opens the
// existing post creation page; nothing about creating a post changes. It sits clear of the phone's menu button, keeps inside the safe area,
// and the page keeps room for it. Under reduced motion the comet rests at the top and nothing moves.
export default function CommunityDock() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const tr = useTranslate();
  if (HIDDEN.test(pathname)) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
      <motion.div
        className="pointer-events-auto relative"
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.5 }}
        whileHover={reduced ? undefined : { y: -3 }}
        whileTap={reduced ? undefined : { scale: 0.97 }}
      >
        <Link
          href="/community/new"
          aria-label={tr("Create a post")}
          className="group relative isolate flex h-[3.4rem] items-center gap-3 overflow-hidden rounded-full pl-2 pr-6 text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {/* No fill at all: the page shows straight through. Only the edge: a quiet hairline all round, and over it one short comet of light that circles it (the comet is clipped to a 1.5px band). */}
          <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full border border-white/25" />
          <span aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden rounded-full p-[1.5px]" style={{ WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)" }}>
            <span className="absolute left-1/2 top-1/2 h-0 w-0">
              <span className="cm-create-ring absolute -left-[170px] -top-[170px] block h-[340px] w-[340px] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_210deg,#f5a524_262deg,#ff5c93_312deg,#9b6bff_342deg,transparent_360deg)]" />
            </span>
          </span>
          {/* A soft sheen that crosses the button when pointed at. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-px -z-10 rounded-full bg-[linear-gradient(110deg,transparent_32%,rgba(255,255,255,0.1)_50%,transparent_68%)] bg-[length:260%_100%] bg-[position:120%_0] transition-[background-position] duration-[1000ms] ease-out group-hover:bg-[position:-20%_0] motion-reduce:transition-none" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(140deg,#f5a524_0%,#ff5c93_55%,#9b6bff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-6px_10px_rgba(0,0,0,0.18)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-6 group-hover:scale-105 motion-reduce:transition-none">
            <CameraPlus />
          </span>
          <span className="text-[15px] font-semibold tracking-[0.01em]">
            <Tx en="Create" />
          </span>
        </Link>
      </motion.div>
    </div>
  );
}
