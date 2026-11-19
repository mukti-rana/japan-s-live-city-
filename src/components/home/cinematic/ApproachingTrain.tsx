"use client";

import { memo, useId, useRef, useState, useSyncExternalStore } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";

// A bullet train coming straight at you, tied to the scroll. Far down a long straight track it starts as two tiny headlights; as the
// "Getting around" chapter scrolls into view it grows, brightens and rushes toward the camera until its nose fills the right half of
// the screen, then sweeps past and fades, so the text can be read again.
//
// It is drawn in true perspective rather than with a 3D engine: the camera is 1.5 m above the rails, so a point at distance d metres
// (relative to the train's front at d = 1) lies 1/d of the way from the horizon to where it would be at the camera. The train is one
// head-on picture of a Shinkansen (rounded nose, windshield, headlights, coupler hatch) scaled by 1/d about the horizon; the rails are
// two thin wedges meeting at the vanishing point; the sleepers are laid at equal steps of d and slide toward the viewer as the page
// scrolls. The headlights bloom (in screen space, so they are visible as bright points when the train is far away) and light the
// track ahead. Under reduced motion it is a still picture of
// the train part-way down the track. Decoration only (aria-hidden), never takes clicks.

const VB = 800; // the scene is an 800 x 800 box, sliced to fit
const VPX = 400;
const VPY = 370; // vanishing point
const CAM = 158; // camera height above the rails, in scene units (1.5 m at 105 units per metre)
const TW = 360; // the train's width in scene units, at d = 1
const HORIZON_IN_TRAIN = 214; // the horizon's height inside the train picture (the camera's eye level)
const GAUGE = 76; // half the gauge
const SLEEPER = 135; // half a sleeper's length
const N_SLEEPERS = 30;
const D_STEP = 0.58;
const D_MIN = 0.36;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// How far away the train is (d), how bright it is, and how far through its approach, for a scroll progress p of the chapter (0 to 1).
function motion(p: number) {
  const a = clamp01((p - 0.08) / 0.42); // the approach
  const b = clamp01((p - 0.5) / 0.3); // sweeping past
  const d = b > 0 ? lerp(1, 0.52, b) : lerp(18, 1, a * a * (3 - 2 * a) * 0.35 + a * 0.65);
  const fade = (1 - Math.pow(b, 1.6)) * (0.35 + 0.65 * clamp01(a * 1.6));
  return { a, b, d, fade };
}

const Train = memo(function Train({ id }: { id: string }) {
  const u = (n: string) => `url(#${id}-${n})`;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-body`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={TW} y2="0">
          <stop offset="0" stopColor="#5f6683" />
          <stop offset="0.2" stopColor="#c4cbe0" />
          <stop offset="0.5" stopColor="#f6f8ff" />
          <stop offset="0.8" stopColor="#c4cbe0" />
          <stop offset="1" stopColor="#5f6683" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#0a0d1c" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1124" />
          <stop offset="0.65" stopColor="#1b2f63" />
          <stop offset="1" stopColor="#0b1430" />
        </linearGradient>
        <linearGradient id={`${id}-stripe`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={TW} y2="0">
          <stop offset="0" stopColor="#12389e" />
          <stop offset="0.5" stopColor="#3f7dff" />
          <stop offset="1" stopColor="#12389e" />
        </linearGradient>
        <radialGradient id={`${id}-lamp`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#fff3d0" />
          <stop offset="1" stopColor="#ffd98a" />
        </radialGradient>
        <linearGradient id={`${id}-skirt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2f42" />
          <stop offset="1" stopColor="#0c0e16" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {/* The car behind the nose, seen over its roof. */}
      <path d="M92 40 Q180 12 268 40 L282 84 L78 84 Z" fill="#8f97b0" />
      <path d="M92 40 Q180 12 268 40 L274 58 Q180 34 86 58 Z" fill="#c9cfe2" opacity="0.7" />
      {/* The nose. */}
      <path d="M34 340 C 22 280 26 200 52 134 C 78 68 126 34 180 34 C 234 34 282 68 308 134 C 334 200 338 280 326 340 Z" fill={u("body")} />
      <path d="M34 340 C 22 280 26 200 52 134 C 78 68 126 34 180 34 C 234 34 282 68 308 134 C 334 200 338 280 326 340 Z" fill={u("shade")} />
      {/* The windshield, with its reflections. */}
      <path d="M70 152 C 78 104 120 72 180 72 C 240 72 282 104 290 152 C 294 178 288 200 278 212 L 82 212 C 72 200 66 178 70 152 Z" fill={u("glass")} stroke="#2c3760" strokeWidth="3" />
      <path d="M98 100 L150 76 L178 76 L124 212 L92 212 Z" fill="#ffffff" opacity="0.1" />
      <path d="M196 80 L212 80 L172 212 L156 212 Z" fill="#9fb8ff" opacity="0.08" />
      <rect x="177" y="72" width="6" height="140" fill="#161b30" />
      {/* The stripe, following the curve of the body. */}
      <path d="M31 292 C 120 308 240 308 329 292 L331 316 C 240 332 120 332 29 316 Z" fill={u("stripe")} />
      <path d="M32 284 C 120 300 240 300 328 284" fill="none" stroke="#9cc3ff" strokeWidth="2" opacity="0.85" />
      {/* Marker lights, and the headlights in their housings. */}
      <circle cx="122" cy="232" r="4.5" fill="#eaf1ff" />
      <circle cx="238" cy="232" r="4.5" fill="#eaf1ff" />
      {[100, 260].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="262" rx="32" ry="16" fill="#0f121d" stroke="#3b4157" strokeWidth="2" />
          <ellipse cx={x} cy="262" rx="23" ry="10" fill={u("lamp")} />
        </g>
      ))}
      {/* The skirt and coupler hatch. */}
      <path d="M46 340 L314 340 L324 372 L36 372 Z" fill={u("skirt")} />
      <circle cx="180" cy="356" r="15" fill="#2d3347" stroke="#4a526c" strokeWidth="2" />
      <path d="M64 350 H150 M210 350 H296 M60 360 H148 M212 360 H300" stroke="#444b63" strokeWidth="2" />
    </g>
  );
});

// Where a point at distance d lies on the screen, and how wide a unit is there.
const yAt = (d: number) => VPY + CAM / d;

export default function ApproachingTrain() {
  // The reduced-motion setting is only known in the browser, so it is applied after hydration (server and first render agree).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const prefersReduced = useReducedMotion();
  const reduced = mounted && Boolean(prefersReduced);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const { scrollYProgress } = useScroll({ target: box, offset: ["start end", "end start"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setP(Math.round(v * 400) / 400));

  const m = motion(reduced ? 0.5 : p);
  const s = 1 / m.d;
  const shake = reduced ? 0 : Math.max(0, m.a - 0.55) * (m.b > 0 ? 1 - m.b : 1);
  const t = reduced ? 0 : p * 220;
  const sx = Math.sin(t * 1.7) * 2.2 * shake;
  const sy = Math.sin(t * 2.3 + 1) * 1.8 * shake;

  // Sleepers: equal steps in d, sliding toward the viewer as the page scrolls.
  const phase = (reduced ? 0.5 : p) * 46;
  const sleepers = Array.from({ length: N_SLEEPERS }, (_, k) => {
    const d = D_MIN + ((((k - phase) % N_SLEEPERS) + N_SLEEPERS) % N_SLEEPERS) * D_STEP;
    return { d, y: yAt(d), half: SLEEPER / d, w: Math.min(34, 26 / d), o: clamp01(1.15 - d / 15) };
  });
  const railTop = VPY;
  const railBottom = VB;
  const railW = (y: number) => 7 * ((y - VPY) / CAM) + 0.5;
  const railX = (y: number) => GAUGE * ((y - VPY) / CAM);
  const rail = (sign: 1 | -1) => {
    const x0 = VPX + sign * railX(railTop), x1 = VPX + sign * railX(railBottom);
    const w0 = railW(railTop) / 2, w1 = railW(railBottom) / 2;
    return `${x0 - w0},${railTop} ${x0 + w0},${railTop} ${x1 + w1},${railBottom} ${x1 - w1},${railBottom}`;
  };

  // The light the train throws on the track ahead of it, and the headlights' bloom.
  const lampY = VPY + (262 - HORIZON_IN_TRAIN) / m.d;
  const baseY = yAt(m.d);
  const bloom = 5 + 90 * Math.pow(m.a, 1.4) + (m.b > 0 ? 60 * m.b : 0);
  const glowOn = clamp01(0.55 + m.a);

  return (
    <div ref={box} aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden opacity-25 sm:opacity-60 xl:w-[58%] xl:opacity-100 xl:[mask-image:linear-gradient(90deg,transparent,#000_22%)]">
      <svg viewBox={`0 0 ${VB} ${VB}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" style={{ opacity: m.fade }}>
        <defs>
          <linearGradient id={`${id}-bed`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#201c2a" stopOpacity="0" />
            <stop offset="0.35" stopColor="#15131c" stopOpacity="0.85" />
            <stop offset="1" stopColor="#07070a" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={`${id}-rail`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9d4ff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#8d96b8" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id={`${id}-haze`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffb98a" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#b48cff" stopOpacity="0.18" />
            <stop offset="1" stopColor="#b48cff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-bloom`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="0.25" stopColor="#fff0c8" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffd08a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-pool`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff2d0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff2d0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-streak`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#dfe6ff" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* The haze at the end of the line, and the track bed running out to the horizon. */}
        <ellipse cx={VPX} cy={VPY} rx="260" ry="90" fill={`url(#${id}-haze)`} />
        <polygon points={`${VPX - 1},${VPY} ${VPX + 1},${VPY} ${VPX + 330},${VB} ${VPX - 330},${VB}`} fill={`url(#${id}-bed)`} />
        {sleepers.map((sl, i) => (
          <line key={i} x1={VPX - sl.half} x2={VPX + sl.half} y1={sl.y} y2={sl.y} stroke="#4b4558" strokeWidth={sl.w} opacity={sl.o * 0.9} />
        ))}
        <polygon points={rail(-1)} fill={`url(#${id}-rail)`} />
        <polygon points={rail(1)} fill={`url(#${id}-rail)`} />

        {/* The light on the track ahead of the train. */}
        <ellipse cx={VPX} cy={Math.min(VB + 40, baseY + 60 * s)} rx={60 + 190 * Math.min(s, 1.6)} ry={22 + 70 * Math.min(s, 1.6)} fill={`url(#${id}-pool)`} opacity={glowOn * m.a} />

        {/* The train, scaled about the horizon by 1/d (with a little shake as it thunders in). */}
        <g transform={`translate(${VPX + sx} ${VPY + sy}) scale(${s}) translate(${-TW / 2} ${-HORIZON_IN_TRAIN})`}>
          <Train id={id} />
        </g>

        {/* The headlights' bloom, in screen space so two bright points can be seen from far away. */}
        {[-1, 1].map((side) => (
          <circle key={side} cx={VPX + side * 80 * s + sx} cy={lampY + sy} r={bloom * (0.5 + 0.5 * glowOn)} fill={`url(#${id}-bloom)`} opacity={glowOn} style={{ mixBlendMode: "screen" }} />
        ))}
      </svg>
    </div>
  );
}
