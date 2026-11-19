"use client";

import { useEffect, useId, useRef, useState } from "react";
import SceneCanvas from "@/components/auth/SceneCanvas";

// The sign-in page's background: Mount Fuji at dusk behind cherry blossom, over a lake with the lights of a bridge and shore.
//
// Layers, bottom to top:
//   1. An illustration drawn here in SVG (sky, Fuji, lake). It is always there, so the page looks right with no network and
//      while the picture loads.
//   2. The picture (public/images/login/fuji-sakura-dusk.webp), shown exactly as supplied: no colour overlay, no zoom, no
//      crop beyond what "cover" needs. It stays underneath as the still version.
//   3. SceneCanvas: the same picture drawn by a small shader that moves the lake and its reflections, sways the cherry branches
//      and drifts the clouds and mist (nothing about the picture's look changes; it only moves). Not started for visitors who
//      ask for less motion.
//   4. A few petals and leaves drifting across the screen on the wind, each tumbling and swaying at its own pace.
// Nothing here takes clicks; the movement stops for people who ask for less motion and while the tab is hidden.

const IMAGE = "/images/login/fuji-sakura-dusk.webp";
// Which part of the picture stays in view on a screen narrower than the picture: 40% across (keeps the blossom and the mountain).
const ANCHOR: [number, number] = [0.4, 0.5];

const PETAL = "M0 0 C -2.6 -1 -4.6 -4.6 -3.3 -7.1 C -2.6 -8.4 -1.1 -8.4 0 -7.2 C 1.1 -8.4 2.6 -8.4 3.3 -7.1 C 4.6 -4.6 2.6 -1 0 0 Z";
const LEAF = "M0 0 C -2.6 -2.2 -2.8 -6.8 0 -10 C 2.8 -6.8 2.6 -2.2 0 0 Z";

// Petals and leaves: x (% across, where they start at the top, mostly under the blossom at the left), size in px, how long the
// fall takes, a negative delay (so they are already in the air when the page opens), the drift to the right in vw, the sideways
// sway in px, the blur of the near ones, and what it is. Fixed numbers, so the server and the browser agree.
type Bit = { x: number; size: number; fall: number; delay: number; dx: number; sw: number; blur: number; leaf?: boolean };
const BITS: Bit[] = [
  { x: 4, size: 15, fall: 26, delay: -3, dx: 34, sw: 38, blur: 0 },
  { x: 11, size: 11, fall: 31, delay: -19, dx: 28, sw: 30, blur: 0 },
  { x: 18, size: 19, fall: 23, delay: -9, dx: 40, sw: 46, blur: 0 },
  { x: 26, size: 12, fall: 33, delay: -26, dx: 30, sw: 34, blur: 0.4 },
  { x: 33, size: 16, fall: 27, delay: -14, dx: 36, sw: 42, blur: 0 },
  { x: 41, size: 10, fall: 36, delay: -31, dx: 26, sw: 28, blur: 0.5 },
  { x: 49, size: 14, fall: 29, delay: -6, dx: 32, sw: 36, blur: 0 },
  { x: 8, size: 13, fall: 30, delay: -22, dx: 26, sw: 32, blur: 0, leaf: true },
  { x: 22, size: 12, fall: 34, delay: -11, dx: 30, sw: 40, blur: 0, leaf: true },
  { x: 37, size: 11, fall: 38, delay: -29, dx: 24, sw: 30, blur: 0, leaf: true },
  { x: 14, size: 46, fall: 21, delay: -7, dx: 22, sw: 60, blur: 3 }, // a near petal, out of focus
  { x: 31, size: 58, fall: 24, delay: -17, dx: 18, sw: 70, blur: 4 },
  { x: 56, size: 40, fall: 28, delay: -12, dx: 16, sw: 50, blur: 3 },
  { x: 62, size: 13, fall: 32, delay: -23, dx: 22, sw: 30, blur: 0 },
];

// Petals that come loose from the blossom now and then: where on the picture each one is shaken off (x across, y down), how big it is,
// how long its whole cycle lasts (most of it is spent waiting on the branch; the flight is the last ~55%), a negative delay so some
// are already in the air, and how far the wind carries it (vw, vh).
const IMAGE_ASPECT = 1672 / 941;
type Shed = { ux: number; uy: number; size: number; cycle: number; delay: number; dx: number; dy: number; sw: number };
const SHED: Shed[] = [
  { ux: 0.07, uy: 0.09, size: 15, cycle: 31, delay: -19, dx: 30, dy: 38, sw: 34 },
  { ux: 0.16, uy: 0.2, size: 12, cycle: 37, delay: -4, dx: 26, dy: 32, sw: 28 },
  { ux: 0.25, uy: 0.11, size: 14, cycle: 29, delay: -27, dx: 32, dy: 40, sw: 36 },
  { ux: 0.33, uy: 0.22, size: 11, cycle: 41, delay: -13, dx: 24, dy: 30, sw: 30 },
  { ux: 0.41, uy: 0.31, size: 13, cycle: 34, delay: -31, dx: 22, dy: 28, sw: 32 },
  { ux: 0.12, uy: 0.4, size: 12, cycle: 39, delay: -8, dx: 28, dy: 22, sw: 26 },
  { ux: 0.22, uy: 0.48, size: 11, cycle: 33, delay: -22, dx: 26, dy: 20, sw: 24 },
  { ux: 0.3, uy: 0.52, size: 13, cycle: 43, delay: -35, dx: 22, dy: 18, sw: 28 },
];

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
  const petalFill = useId();
  const leafFill = useId();
  const root = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  // The size of the screen, to put each shed petal on its own spot of the picture (the same "cover" placement the picture uses).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const va = box ? box.w / Math.max(box.h, 1) : IMAGE_ASPECT;
  const sx = va < IMAGE_ASPECT ? va / IMAGE_ASPECT : 1;
  const sy = va < IMAGE_ASPECT ? 1 : IMAGE_ASPECT / va;
  const offX = ANCHOR[0] * (1 - sx);
  const offY = ANCHOR[1] * (1 - sy);
  return (
    <div ref={root} className="auth-backdrop pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#141a44]">
      <Illustration />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMAGE} alt="" decoding="async" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${ANCHOR[0] * 100}% ${ANCHOR[1] * 100}%` }} />
      <SceneCanvas src={IMAGE} anchor={ANCHOR} />

      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <radialGradient id={petalFill} cx="0.5" cy="1" r="1.05">
            <stop offset="0" stopColor="#e65f93" />
            <stop offset="0.25" stopColor="#f7a0c1" />
            <stop offset="0.65" stopColor="#fbd7e5" />
            <stop offset="1" stopColor="#fdf4f8" />
          </radialGradient>
          <linearGradient id={leafFill} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#8e3b3a" />
            <stop offset="1" stopColor="#c8644a" />
          </linearGradient>
        </defs>
      </svg>

      <div aria-hidden="true" className="auth-petals absolute inset-0 overflow-hidden">
        {BITS.map((b, i) => (
          <span key={i} className="auth-petal" style={{ left: `${b.x}%`, width: b.size, height: b.size * 1.25, animationDuration: `${b.fall}s`, animationDelay: `${b.delay}s`, ["--dx" as string]: `${b.dx}vw` }}>
            <span className="auth-petal__sway" style={{ animationDuration: `${b.fall / 4.2}s`, animationDelay: `${b.delay / 3}s`, ["--sw" as string]: `${b.sw}px` }}>
              <svg viewBox="-4 -10 8 11" className="auth-petal__spin block h-full w-full" style={{ animationDuration: `${3.4 + (i % 5) * 0.9}s`, animationDelay: `${i * -0.7}s`, filter: b.blur ? `blur(${b.blur}px)` : undefined }}>
                {b.leaf ? (
                  <>
                    <path d={LEAF} fill={`url(#${leafFill})`} />
                    <path d="M0 -0.6 L0 -8.6" stroke="#e9a37f" strokeWidth="0.18" opacity="0.7" fill="none" />
                  </>
                ) : (
                  <>
                    <path d={PETAL} fill={`url(#${petalFill})`} stroke="#f0a3c0" strokeWidth="0.12" />
                    <path d="M0 -0.6 L0 -5.4" stroke="#e8749f" strokeWidth="0.14" opacity="0.4" fill="none" />
                  </>
                )}
              </svg>
            </span>
          </span>
        ))}
        {/* Petals shaken loose from the blossom, one now and then, each from its own spot on the branches. */}
        {box &&
          SHED.map((b, i) => {
            const left = ((b.ux - offX) / sx) * 100;
            const top = ((b.uy - offY) / sy) * 100;
            if (left < -2 || left > 102 || top < -2 || top > 102) return null;
            return (
              <span key={`s${i}`} className="auth-petal auth-shed" style={{ left: `${left}%`, top: `${top}%`, width: b.size, height: b.size * 1.25, animationDuration: `${b.cycle}s`, animationDelay: `${b.delay}s`, ["--dx" as string]: `${b.dx}vw`, ["--dy" as string]: `${b.dy}vh` }}>
                <span className="auth-petal__sway" style={{ animationDuration: `${b.cycle / 8}s`, animationDelay: `${b.delay / 5}s`, ["--sw" as string]: `${b.sw}px` }}>
                  <svg viewBox="-4 -10 8 11" className="auth-petal__spin block h-full w-full" style={{ animationDuration: `${3 + (i % 4) * 0.8}s`, animationDelay: `${i * -0.9}s` }}>
                    <path d={PETAL} fill={`url(#${petalFill})`} stroke="#f0a3c0" strokeWidth="0.12" />
                    <path d="M0 -0.6 L0 -5.4" stroke="#e8749f" strokeWidth="0.14" opacity="0.4" fill="none" />
                  </svg>
                </span>
              </span>
            );
          })}
      </div>
    </div>
  );
}
