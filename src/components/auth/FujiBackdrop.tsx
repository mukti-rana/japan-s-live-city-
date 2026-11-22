"use client";

import SceneCanvas from "@/components/auth/SceneCanvas";
import PetalField from "@/components/auth/PetalField";

// The sign-in page's background: Mount Fuji at dusk behind cherry blossom, over a lake with the lights of a bridge and shore.
//
// Layers, bottom to top:
//   1. An illustration drawn here in SVG (sky, Fuji, lake). It is always there, so the page looks right with no network and
//      while the picture loads.
//   2. The picture (public/images/login/fuji-sakura-dusk.webp): the same picture, no zoom, no crop beyond what "cover" needs, graded
//      a little calmer (colour drawn back, a touch darker; the shader does the same, see SceneCanvas). It stays underneath as the
//      still version.
//   3. SceneCanvas: the same picture drawn by a small shader that moves the lake and its reflections, sways the cherry branches
//      and drifts the clouds and mist (nothing about the picture's look changes; it only moves). Not started for visitors who
//      ask for less motion.
//   4. PetalField: a few petals and leaves blown by the same wind that bends the branches, some coming loose from the twigs.
//   5. A quiet dark overlay: a soft vignette and a deeper top and foot, so the scene feels cinematic and the panel's text sits on calm
//      ground. It is neutral (blue-black), not a colour wash, and carries no information.
// Nothing here takes clicks; the movement stops for people who ask for less motion and while the tab is hidden.

const IMAGE = "/images/login/fuji-sakura-dusk.webp";
// Which part of the picture stays in view on a screen narrower than the picture: 40% across (keeps the blossom and the mountain).
const ANCHOR: [number, number] = [0.4, 0.5];

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
  return (
    <div className="auth-backdrop pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#141a44]">
      <Illustration />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMAGE} alt="" decoding="async" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${ANCHOR[0] * 100}% ${ANCHOR[1] * 100}%`, filter: "saturate(0.72) brightness(0.9)" }} />
      <SceneCanvas src={IMAGE} anchor={ANCHOR} />
      <PetalField anchor={ANCHOR} />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 95% at 36% 46%, transparent 42%, rgba(4,6,14,0.4) 100%), linear-gradient(180deg, rgba(6,8,18,0.34) 0%, rgba(6,8,18,0.1) 30%, rgba(6,8,18,0.14) 58%, rgba(6,8,18,0.44) 100%), linear-gradient(90deg, transparent 52%, rgba(6,8,18,0.2) 100%)",
        }}
      />
    </div>
  );
}
