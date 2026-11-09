import { useId } from "react";

// Cherry-blossom branches growing in from the corners of the sign-in page.
// Each branch draws itself, then its blossoms open one after another, then it
// sways very gently. Everything is decorative (aria-hidden, no clicks).
//
// Used inside `.atm-anim`: the motion stops when the tab is hidden, and for
// visitors who ask for less motion nothing moves — the branches are simply
// there, fully bloomed.

type Limb = { d: string; w: number };

// One branch, drawn in a 400 x 300 box with its root at the top-left corner.
const LIMBS: Limb[] = [
  { d: "M-12 -12 C 60 30, 120 40, 190 90 C 240 125, 285 132, 345 172", w: 11 },
  { d: "M88 36 C 110 70, 100 112, 122 152", w: 6 },
  { d: "M190 90 C 200 62, 230 42, 264 36", w: 5 },
  { d: "M252 122 C 272 152, 270 192, 292 226", w: 4 },
  { d: "M150 62 C 150 32, 170 14, 202 8", w: 4 },
  { d: "M40 18 C 52 44, 46 64, 60 86", w: 3.5 },
  { d: "M300 148 C 322 140, 346 146, 368 134", w: 3 },
];

// Where the blossoms sit: [x, y, size].
const BLOSSOMS: [number, number, number][] = [
  [44, 24, 1], [66, 40, 1.1], [100, 54, 1], [132, 62, 1.25], [162, 78, 1], [194, 94, 1.35], [226, 114, 1], [256, 128, 1.1],
  [296, 142, 1], [332, 164, 1.2], [350, 176, 0.9], [90, 64, 1], [98, 98, 1.15], [108, 130, 1], [122, 152, 1.25],
  [206, 70, 1], [234, 48, 1.25], [264, 38, 1.05], [272, 152, 1], [278, 188, 1.15], [292, 224, 1], [160, 38, 1],
  [174, 18, 1.25], [202, 8, 1], [60, 90, 0.95], [48, 66, 0.9], [20, 40, 1.1], [320, 148, 0.95], [366, 136, 1], [240, 90, 0.8],
];

const TINTS = ["#ffc4dc", "#fff0f6", "#ff9cc4", "#ffd9e8"];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export default function SakuraBranches({ className, seed = 3, blur = 0, delay = 0 }: { className?: string; seed?: number; blur?: number; delay?: number }) {
  const id = useId();
  const r = rng(seed);
  const blossoms = BLOSSOMS.map(([x, y, s], i) => ({
    x: x + (r() - 0.5) * 8,
    y: y + (r() - 0.5) * 8,
    s: s * (0.9 + r() * 0.3),
    rot: Math.round(r() * 72),
    tint: TINTS[Math.floor(r() * TINTS.length)],
    d: delay + 1.1 + i * 0.1 + r() * 0.12,
  }));
  const buds = Array.from({ length: 9 }, () => ({ x: 30 + r() * 330, y: 10 + r() * 190, d: delay + 1 + r() * 2 }));
  const bloom = `${id}-bloom`;

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute ${className ?? ""}`} style={blur ? { filter: `blur(${blur}px)` } : undefined}>
      <div className="sakura-sway origin-top-left" style={{ animationDelay: `${delay}s` }}>
        <svg viewBox="0 0 400 300" className="block h-auto w-full overflow-visible">
          <defs>
            <radialGradient id={bloom} cx="0.5" cy="0.5" r="0.55">
              <stop offset="0" stopColor="#ff7fb0" />
              <stop offset="0.35" stopColor="#ffd0e2" />
              <stop offset="1" stopColor="#fff6fa" />
            </radialGradient>
          </defs>

          {/* limbs: a dark plum stroke with a lighter edge, drawn from the corner outward */}
          {LIMBS.map((l, i) => (
            <g key={i} fill="none" strokeLinecap="round">
              <path d={l.d} pathLength={1} className="sakura-grow" stroke="#3a2146" strokeWidth={l.w * 1.15} style={{ animationDelay: `${delay + i * 0.18}s` }} />
              <path d={l.d} pathLength={1} className="sakura-grow" stroke="#7a4f86" strokeWidth={Math.max(1, l.w * 0.3)} strokeOpacity="0.85" style={{ animationDelay: `${delay + i * 0.18}s`, transform: "translate(-1px,-1px)" }} />
            </g>
          ))}

          {buds.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={2.2} fill="#d9578f" className="sakura-pop" style={{ animationDelay: `${b.d}s` }} />
          ))}

          {blossoms.map((b, i) => (
            <g key={i} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.rot}) scale(${(b.s * 1.0).toFixed(2)})`}>
              <g className="sakura-pop" style={{ animationDelay: `${b.d.toFixed(2)}s` }}>
                <g fill={b.tint === "#fff0f6" || b.tint === "#ffd9e8" ? b.tint : `url(#${bloom})`} stroke="#d9578f" strokeWidth="0.55" strokeOpacity="0.8">
                  <circle cy="-6.4" r="5" />
                  <circle cx="6.1" cy="-2" r="5" />
                  <circle cx="3.8" cy="5.2" r="5" />
                  <circle cx="-3.8" cy="5.2" r="5" />
                  <circle cx="-6.1" cy="-2" r="5" />
                </g>
                <circle r="2.1" fill="#ff5c9a" />
                <g stroke="#ffd98a" strokeWidth="0.6" strokeLinecap="round">
                  <path d="M0 0 L0 -3.2" /><path d="M0 0 L3 -1" /><path d="M0 0 L1.9 2.6" /><path d="M0 0 L-1.9 2.6" /><path d="M0 0 L-3 -1" />
                </g>
              </g>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
