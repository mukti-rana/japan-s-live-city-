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
// two thin wedges meeting at the vanishing point; the sleepers stand still in the world (only the train moves, so it reads as a train
// running down the track, not a track sliding by). The headlights are two small points of light, visible from far away. Under reduced motion it is a still picture of
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
const D_STEP = 0.5;
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
        <linearGradient id={`${id}-pearl`} gradientUnits="userSpaceOnUse" x1="44" y1="0" x2="316" y2="0">
          <stop offset="0" stopColor="#7a829c" />
          <stop offset="0.16" stopColor="#c9d0e2" />
          <stop offset="0.5" stopColor="#f7f9ff" />
          <stop offset="0.84" stopColor="#c9d0e2" />
          <stop offset="1" stopColor="#7a829c" />
        </linearGradient>
        <linearGradient id={`${id}-carside`} gradientUnits="userSpaceOnUse" x1="28" y1="0" x2="332" y2="0">
          <stop offset="0" stopColor="#555c75" />
          <stop offset="0.2" stopColor="#a4abc0" />
          <stop offset="0.5" stopColor="#c3c9db" />
          <stop offset="0.8" stopColor="#a4abc0" />
          <stop offset="1" stopColor="#555c75" />
        </linearGradient>
        <linearGradient id={`${id}-vshade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#0a0d1c" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070f" />
          <stop offset="0.55" stopColor="#101a38" />
          <stop offset="1" stopColor="#070b18" />
        </linearGradient>
        <linearGradient id={`${id}-navy`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d45a8" />
          <stop offset="0.5" stopColor="#14307c" />
          <stop offset="1" stopColor="#0a1842" />
        </linearGradient>
        <linearGradient id={`${id}-navyh`} gradientUnits="userSpaceOnUse" x1="50" y1="0" x2="310" y2="0">
          <stop offset="0" stopColor="#000000" stopOpacity="0.45" />
          <stop offset="0.3" stopColor="#000000" stopOpacity="0" />
          <stop offset="0.7" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={`${id}-lamp`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe8ff" />
        </linearGradient>
        <linearGradient id={`${id}-skirt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#323850" />
          <stop offset="1" stopColor="#0b0d15" />
        </linearGradient>
        <radialGradient id={`${id}-contact`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.7" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Its shadow on the ballast. */}
      <ellipse cx="180" cy="378" rx="190" ry="14" fill={u("contact")} />
      {/* The car behind the nose: only its roof shows above the dome, with the pantograph and an air-conditioning housing. */}
      <path d="M78 130 L78 76 Q78 54 104 52 L256 52 Q282 54 282 76 L282 130 Z" fill={u("carside")} />
      <path d="M78 130 L78 76 Q78 54 104 52 L256 52 Q282 54 282 76 L282 130 Z" fill={u("vshade")} />
      <rect x="128" y="42" width="104" height="12" rx="5" fill="#8a91aa" />
      <path d="M152 42 L172 16 L188 16 L208 42" fill="none" stroke="#2b3046" strokeWidth="3" strokeLinejoin="round" />
      <path d="M158 16 H202" stroke="#2b3046" strokeWidth="4" strokeLinecap="round" />
      {/* The streamlined nose: a wide, smooth dome in pearl white. */}
      <path d="M50 338 C 40 282 44 212 66 154 C 92 92 136 60 180 58 C 224 60 268 92 294 154 C 316 212 320 282 310 338 Z" fill={u("pearl")} />
      <path d="M50 338 C 40 282 44 212 66 154 C 92 92 136 60 180 58 C 224 60 268 92 294 154 C 316 212 320 282 310 338 Z" fill={u("vshade")} />
      <path d="M180 60 L180 108 M174 214 L174 262 M186 214 L186 262" stroke="#ffffff" strokeWidth="2" opacity="0.32" fill="none" />
      {/* The windshield: wide, low, glossy black, with a pearl frame and the wipers parked at its foot. */}
      <path d="M84 178 C 88 148 124 122 180 120 C 236 122 272 148 276 178 C 278 194 272 206 260 211 L 100 211 C 88 206 82 194 84 178 Z" fill={u("glass")} stroke="#e9edf9" strokeWidth="3" />
      <path d="M98 160 C 112 140 146 130 176 130 L148 206 L102 206 C 96 192 94 174 98 160 Z" fill="#ffffff" opacity="0.1" />
      <path d="M206 130 L230 134 L190 206 L170 206 Z" fill="#a8bcff" opacity="0.07" />
      <path d="M112 205 L172 193 M248 205 L188 193" stroke="#3a4262" strokeWidth="2.4" strokeLinecap="round" />
      {/* The lower nose in navy, with its upper edge catching the light. */}
      <path d="M52 318 C 66 268 118 262 180 262 C 242 262 294 268 308 318 L306 338 L54 338 Z" fill={u("navy")} />
      <path d="M52 318 C 66 268 118 262 180 262 C 242 262 294 268 308 318 L306 338 L54 338 Z" fill={u("navyh")} />
      <path d="M58 306 C 78 276 124 270 180 270 C 236 270 282 276 302 306" fill="none" stroke="#7fa6ff" strokeWidth="1.6" opacity="0.7" />
      {/* Slim, level LED headlights low on either side, and marker lights above them. */}
      {[1, -1].map((sg) => {
        const x = (v: number) => 180 + sg * (v - 180);
        return (
          <g key={sg}>
            <path d={`M${x(76)} 294 L${x(150)} 292 L${x(150)} 304 L${x(80)} 306 Z`} fill="#090c16" stroke="#3c4768" strokeWidth="1.5" />
            <path d={`M${x(83)} 297.5 L${x(144)} 295.5 L${x(144)} 301 L${x(86)} 302.5 Z`} fill={u("lamp")} />
            {[96, 108, 120, 132].map((px) => (
              <circle key={px} cx={x(px)} cy="299" r="1.5" fill="#8aa4e8" opacity="0.85" />
            ))}
            <circle cx={x(92)} cy="272" r="3.6" fill="#eef3ff" />
          </g>
        );
      })}
      {/* The apron, the coupler flap and the bogies. */}
      <path d="M72 338 L288 338 L300 374 L60 374 Z" fill={u("skirt")} />
      <rect x="150" y="347" width="60" height="22" rx="8" fill="#4a526b" stroke="#6a7391" strokeWidth="1.5" />
      <path d="M180 347 V369 M154 358 H206" stroke="#2b3146" strokeWidth="1.5" />
      <path d="M78 350 H142 M218 350 H282 M74 362 H140 M220 362 H286" stroke="#444c66" strokeWidth="2" />
      <rect x="70" y="374" width="46" height="9" rx="2" fill="#07080d" />
      <rect x="244" y="374" width="46" height="9" rx="2" fill="#07080d" />
    </g>
  );
});

// Where a point at distance d lies on the screen, and how wide a unit is there.
const yAt = (d: number) => VPY + CAM / d;

const STATIC_SLEEPERS = Array.from({ length: N_SLEEPERS * 2 }, (_, k) => {
  const d = D_MIN + k * D_STEP;
  return { d, y: yAt(d), half: SLEEPER / d, w: Math.min(9, 7 / d), o: clamp01(1.1 - d / 20) };
});

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

  // The sleepers stand still in the world; only the train moves.
  const sleepers = STATIC_SLEEPERS;

  const railTop = VPY;
  const railBottom = VB;
  const railW = (y: number) => 7 * ((y - VPY) / CAM) + 0.5;
  const railX = (y: number) => GAUGE * ((y - VPY) / CAM);
  const rail = (sign: 1 | -1) => {
    const x0 = VPX + sign * railX(railTop), x1 = VPX + sign * railX(railBottom);
    const w0 = railW(railTop) / 2, w1 = railW(railBottom) / 2;
    return `${x0 - w0},${railTop} ${x0 + w0},${railTop} ${x1 + w1},${railBottom} ${x1 - w1},${railBottom}`;
  };

  // The headlights: two small points, visible from far away and no bigger than lamps need to be when the train is near.
  const lampLocalY = 299;
  const lampY = VPY + (lampLocalY - HORIZON_IN_TRAIN) * s;
  const lampX = 65 * s;
  const lampR = Math.min(2.2 + 4.5 * s, 14);

  return (
    <div ref={box} aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden opacity-25 sm:opacity-60 xl:w-[58%] xl:opacity-100 xl:[mask-image:linear-gradient(90deg,transparent,#000_22%)]">
      <svg viewBox={`0 0 ${VB} ${VB}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" style={{ opacity: m.fade }}>
        <defs>
          <linearGradient id={`${id}-bed`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#201c2a" stopOpacity="0" />
            <stop offset="0.35" stopColor="#15131c" stopOpacity="0.8" />
            <stop offset="1" stopColor="#07070a" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id={`${id}-rail`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#aab4d6" stopOpacity="0.75" />
            <stop offset="1" stopColor="#7a84a6" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id={`${id}-haze`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffb98a" stopOpacity="0.28" />
            <stop offset="0.5" stopColor="#b48cff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#b48cff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-lamp`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="0.4" stopColor="#f4f7ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#dfe8ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* The haze at the end of the line, the track bed running out to the horizon, the sleepers and the rails: all fixed in the world. */}
        <ellipse cx={VPX} cy={VPY} rx="220" ry="70" fill={`url(#${id}-haze)`} />
        <polygon points={`${VPX - 1},${VPY} ${VPX + 1},${VPY} ${VPX + 330},${VB} ${VPX - 330},${VB}`} fill={`url(#${id}-bed)`} />
        {sleepers.map((sl, i) => (
          <line key={i} x1={VPX - sl.half} x2={VPX + sl.half} y1={sl.y} y2={sl.y} stroke="#3b3648" strokeWidth={sl.w} opacity={sl.o * 0.6} />
        ))}
        <polygon points={rail(-1)} fill={`url(#${id}-rail)`} />
        <polygon points={rail(1)} fill={`url(#${id}-rail)`} />

        {/* The train, scaled about the horizon by 1/d (with a little shake as it thunders in). */}
        <g transform={`translate(${VPX + sx} ${VPY + sy}) scale(${s}) translate(${-TW / 2} ${-HORIZON_IN_TRAIN})`}>
          <Train id={id} />
        </g>

        {/* The headlights: a small glint on each lamp, nothing more. */}
        {[-1, 1].map((side) => (
          <circle key={side} cx={VPX + side * lampX + sx} cy={lampY + sy} r={lampR * 1.9} fill={`url(#${id}-lamp)`} opacity={0.5 + 0.4 * m.a} />
        ))}
      </svg>
    </div>
  );
}
