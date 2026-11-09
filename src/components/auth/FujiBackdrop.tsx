"use client";

import { useTranslate } from "@/lib/i18n/inline";

// Mount Fuji over a still lake at dusk, full screen behind the sign-in panel.
//
// Layers, bottom to top:
//   1. An illustration drawn here in SVG (sky, Fuji, lake with its reflection).
//      It is always there, so the page looks right with no network and while
//      the photograph loads.
//   2. A real photograph of Fuji reflected in Lake Kawaguchi, fading in once it
//      has loaded. It is loaded from Wikimedia Commons (CC0 — public domain
//      dedication, by Marion & Christoph Aistl), not copied into this project.
//      If it can't load, the illustration simply stays.
//   3. Dusk colour (navy → lavender → pink), a soft glow at the horizon, and a
//      little drifting mist and a few sakura petals.
// Nothing here takes clicks, and the movement stops for people who ask for
// less motion and while the tab is hidden.

const FILE = "Fuji_Kawaguchi_475.JPG";
const BASE = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d";
const thumb = (w: number) => `${BASE}/${FILE}/${w}px-${FILE}`;
const FILE_PAGE = `https://commons.wikimedia.org/wiki/File:${FILE}`;

const PETALS = Array.from({ length: 9 }, (_, i) => ({ x: (i * 43 + 7) % 100, delay: -((i * 2.7) % 16), dur: 16 + ((i * 3) % 7), size: 7 + ((i * 5) % 6), dx: ((i * 19) % 60) - 30 }));

function Illustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="fj-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141a44" />
          <stop offset="0.45" stopColor="#3e3677" />
          <stop offset="0.8" stopColor="#a67fb8" />
          <stop offset="1" stopColor="#f0b4c6" />
        </linearGradient>
        <linearGradient id="fj-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b5a99" />
          <stop offset="0.5" stopColor="#2a2a5c" />
          <stop offset="1" stopColor="#0f1330" />
        </linearGradient>
        <linearGradient id="fj-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4a86" />
          <stop offset="1" stopColor="#25274f" />
        </linearGradient>
        <filter id="fj-soft" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <g id="fj-mountain">
          <path d="M120 520 C 380 506 540 340 690 220 L 756 172 Q 800 158 844 172 L 910 220 C 1060 340 1220 506 1480 520 Z" fill="url(#fj-body)" />
          <path d="M690 220 L756 172 Q800 158 844 172 L910 220 L880 236 L848 214 L820 246 L792 218 L760 244 L732 222 L712 238 Z" fill="#f3ebff" opacity="0.92" />
        </g>
      </defs>
      <rect width="1600" height="520" fill="url(#fj-sky)" />
      <use href="#fj-mountain" />
      <path d="M0 520 L0 470 C 140 450 260 480 420 505 L420 520 Z M1600 520 L1600 480 C 1480 462 1340 490 1180 508 L1180 520 Z" fill="#1c1e45" />
      <rect y="520" width="1600" height="380" fill="url(#fj-lake)" />
      <g filter="url(#fj-soft)" opacity="0.5">
        <use href="#fj-mountain" transform="translate(0 1040) scale(1 -1)" />
      </g>
      <rect y="520" width="1600" height="3" fill="#f0b4c6" opacity="0.5" />
    </svg>
  );
}

export default function FujiBackdrop() {
  const tr = useTranslate();
  return (
    <div className="group pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#141a44]">
      <Illustration />

      {/* The photograph. It starts invisible; the load handler (or the ref, if
          it finished loading before this page woke up) reveals it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={(el) => {
          if (el && el.complete && el.naturalWidth > 0) el.dataset.ready = "1";
        }}
        src={thumb(1920)}
        srcSet={`${thumb(1280)} 1280w, ${thumb(1920)} 1920w`}
        sizes="100vw"
        alt=""
        decoding="async"
        fetchPriority="high"
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          e.currentTarget.dataset.ready = "1";
        }}
        onError={(e) => {
          e.currentTarget.hidden = true;
        }}
        className="auth-zoom absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-1000 [object-position:50%_42%] data-[ready]:opacity-100"
      />

      {/* Dusk colour over everything: deep navy above, lavender and pink at the
          horizon, navy again at the bottom edge. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0e1a]/65 via-[#3a2f72]/30 to-[#0b0e1a]/75" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_38%_at_50%_58%,rgba(255,150,190,0.28),transparent_70%)]" />

      <div aria-hidden="true" className="atm-root atm-anim absolute inset-0 overflow-hidden">
        <span className="auth-cloud absolute -left-[10%] top-[10%] h-24 w-[55%] rounded-full bg-white/[0.08] blur-3xl" style={{ animationDuration: "70s" }} />
        <span className="auth-cloud absolute left-[30%] top-[22%] h-20 w-[50%] rounded-full bg-white/[0.07] blur-3xl" style={{ animationDuration: "95s", animationDelay: "-30s" }} />
        <span className="auth-shimmer absolute inset-x-0 bottom-0 h-[40%] mix-blend-screen" />
        {PETALS.map((p, i) => (
          <span key={i} className="atm-fall absolute top-0 block" style={{ left: `${p.x}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ["--dx" as string]: `${p.dx}px` }}>
            <span className="atm-sway atm-petal block h-full w-full opacity-70" style={{ animationDuration: `${4 + (i % 4)}s`, animationDelay: `${p.delay}s` }} />
          </span>
        ))}
      </div>

      {/* Credit — shown only while the photograph is the one on screen. */}
      <p className="pointer-events-auto absolute bottom-2 left-4 text-[11px] text-white/75 opacity-0 transition-opacity group-has-[img[data-ready]]:opacity-100 sm:left-8">
        {tr("Photo: {name}").replace("{name}", "Marion & Christoph Aistl")} ·{" "}
        <a href={FILE_PAGE} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac">
          {tr("CC0, Wikimedia Commons")}
        </a>
      </p>
    </div>
  );
}
