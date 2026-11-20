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

// The Community's Create button, floating at the foot of the screen: an amber, pink, violet and blue ring slowly turns round its edge, a soft glow
// breathes behind it, it lifts a little when pointed at and presses in when tapped. It opens the existing post creation page; nothing about
// creating a post changes. It sits clear of the phone's menu button (at the left), keeps inside the safe area, and the page keeps room for it.
export default function CommunityDock() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const tr = useTranslate();
  if (HIDDEN.test(pathname)) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
      <motion.div
        className="pointer-events-auto relative"
        initial={reduced ? false : { opacity: 0, y: 28, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.5 }}
        whileHover={reduced ? undefined : { y: -4 }}
        whileTap={reduced ? undefined : { scale: 0.96 }}
      >
        {/* The breathing glow, behind everything. */}
        <span aria-hidden="true" className="cm-create-glow pointer-events-none absolute -inset-3 -z-10 rounded-full bg-[conic-gradient(from_200deg,#f5a524,#ff5c93,#9b6bff,#4da3ff,#f5a524)] opacity-60 blur-2xl" />
        <Link
          href="/community/new"
          aria-label={tr("Create a post")}
          className="group relative isolate flex h-14 items-center gap-3 overflow-hidden rounded-full pl-2.5 pr-6 text-white shadow-[0_18px_40px_-14px_rgba(0,0,0,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {/* The turning ring: a big conic gradient behind the button, of which only the edge shows. */}
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 -z-20 h-0 w-0">
            <span className="cm-create-ring absolute -left-[170px] -top-[170px] block h-[340px] w-[340px] bg-[conic-gradient(#f5a524,#ff5c93,#9b6bff,#4da3ff,#f5a524)]" />
          </span>
          {/* The button's face, leaving a thin edge of the ring. */}
          <span aria-hidden="true" className="absolute inset-[1.5px] -z-10 rounded-full bg-[#09090c]/95 backdrop-blur-xl transition-colors duration-300 group-hover:bg-[#0d0d12]/90" />
          {/* A soft sheen that crosses the face when pointed at. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-[1.5px] -z-10 rounded-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.14)_50%,transparent_70%)] bg-[length:250%_100%] bg-[position:120%_0] transition-[background-position] duration-[900ms] ease-out group-hover:bg-[position:-20%_0] motion-reduce:transition-none" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f5a524_0%,#ff5c93_50%,#9b6bff_100%)] shadow-[0_6px_18px_-6px_rgba(255,92,147,0.9)] transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6 motion-reduce:transition-none">
            <CameraPlus />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            <Tx en="Create" />
          </span>
        </Link>
      </motion.div>
    </div>
  );
}
