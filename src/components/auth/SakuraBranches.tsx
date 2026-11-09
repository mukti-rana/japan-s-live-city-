import { useId } from "react";

// A cherry-blossom branch growing in from a corner of the sign-in page.
//
// It is drawn to look like the real thing rather than clip-art:
//  - blossoms have five notched, translucent petals that fade from deep pink at
//    the heart to near-white at the tips, with veins, and a crown of stamens
//    tipped with pollen;
//  - they grow in small clusters on thin stalks (as sakura do), each one turned,
//    sized and tilted differently, with some seen side-on;
//  - the limbs taper, have rough bark with pale flecks, and carry a few young
//    bronze leaves and unopened buds;
//  - sharp blossoms cast a soft shadow, and a few large blurred ones sit in the
//    foreground for depth, as in a photograph.
// The blossoms open outward from the corner, one after another, then the branch
// sways very gently. Used inside `.atm-anim`: it stops when the tab is hidden,
// and for visitors who ask for less motion the finished branch just stays.

// Branch geometry, in a 400 x 300 box rooted at the top-left corner.
const LIMBS: { d: string; w: number }[] = [
  { d: "M-14 -10 C 50 18 100 26 150 62 S 240 110 285 112 S 340 150 374 166", w: 11 },
  { d: "M96 30 C 108 62 98 98 112 130 S 120 150 118 168", w: 5.5 },
  { d: "M150 62 C 160 40 176 24 206 14", w: 4.5 },
  { d: "M230 92 C 250 70 262 56 292 50", w: 4 },
  { d: "M270 112 C 280 140 276 168 292 198 S 296 214 294 230", w: 4 },
  { d: "M38 12 C 50 36 44 58 56 82", w: 3.5 },
  { d: "M318 140 C 336 130 352 134 380 120", w: 3 },
  { d: "M190 82 C 200 104 192 126 204 146", w: 3 },
];

// Where clusters of blossoms sprout (on or just off the limbs).
const ANCHORS: [number, number][] = [
  [48, 26], [78, 40], [108, 46], [104, 88], [112, 126], [118, 162], [150, 58], [178, 38], [206, 16], [190, 86], [204, 144],
  [238, 90], [264, 66], [292, 52], [272, 118], [286, 176], [294, 218], [324, 138], [354, 132], [376, 162], [242, 114], [332, 152],
  [60, 82], [44, 58],
];

// Young leaves, which come out bronze: [x, y, rotation].
const LEAVES: [number, number, number][] = [
  [130, 56, -40], [168, 70, 30], [214, 100, 60], [246, 104, -30], [282, 124, 40], [306, 146, -20], [96, 44, -70], [74, 52, -120], [200, 20, -25], [286, 42, -60],
];

// Round every computed coordinate, so the server and the browser print
// exactly the same numbers (trig results can differ in the last digits).
const n2 = (v: number) => Math.round(v * 100) / 100;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export default function SakuraBranches({ className, seed = 3, blur = 0, delay = 0 }: { className?: string; seed?: number; blur?: number; delay?: number }) {
  const id = useId();
  const u = (n: string) => `${id}-${n}`;
  const r = rng(seed);

  // Clusters of blossoms on short stalks.
  const flowers: { x: number; y: number; ax: number; ay: number; s: number; rot: number; tilt: boolean; v: number; d: number }[] = [];
  ANCHORS.forEach(([ax, ay]) => {
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2;
      const dist = 7 + r() * 11;
      const x = ax + n2(Math.cos(a) * dist);
      const y = ay + n2(Math.sin(a) * dist * 0.8);
      flowers.push({ x: n2(x), y: n2(y), ax, ay, s: 0.8 + r() * 0.55, rot: Math.round(r() * 360), tilt: r() < 0.25, v: r() < 0.5 ? 1 : 2, d: n2(delay + 0.7 + ((x + y) / 700) * 2.6 + r() * 0.35) });
    }
  });
  const buds = Array.from({ length: 8 }, () => {
    const [ax, ay] = ANCHORS[Math.floor(r() * ANCHORS.length)];
    return { x: n2(ax + (r() - 0.5) * 22), y: n2(ay + (r() - 0.5) * 18), rot: Math.round(r() * 360), d: n2(delay + 0.9 + r() * 2) };
  });
  // Big soft blossoms in the foreground (out of focus).
  const near: [number, number, number][] = [[16, 40, 2.3], [352, 190, 2.6], [128, 176, 2.1], [250, 12, 2]];

  const petal = "M0 0 C -2.6 -1 -4.6 -4.6 -3.3 -7.1 C -2.6 -8.4 -1.1 -8.4 0 -7.2 C 1.1 -8.4 2.6 -8.4 3.3 -7.1 C 4.6 -4.6 2.6 -1 0 0 Z";

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute ${className ?? ""}`} style={blur ? { filter: `blur(${blur}px)` } : undefined}>
      <div className="sakura-sway origin-top-left" style={{ animationDelay: `${delay}s` }}>
        <svg viewBox="0 0 400 300" className="block h-auto w-full overflow-visible">
          <defs>
            {/* petal colour: deep pink at the heart, white at the tip */}
            <radialGradient id={u("petal")} cx="0.5" cy="1" r="1.05">
              <stop offset="0" stopColor="#ee5f97" />
              <stop offset="0.22" stopColor="#ff9fc3" />
              <stop offset="0.6" stopColor="#ffd6e6" />
              <stop offset="1" stopColor="#fff9fc" />
            </radialGradient>
            <filter id={u("shadow")} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0.9" stdDeviation="1" floodColor="#2a0f2e" floodOpacity="0.45" />
            </filter>
            <filter id={u("bark")} x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed={seed} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id={u("soft")} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>

            <path id={u("p")} d={petal} />
            {/* one open blossom: five petals, veins, stamens */}
            {[1, 2].map((v) => (
              <g key={v} id={u(`bl${v}`)}>
                {[0, 1, 2, 3, 4].map((k) => {
                  const jitter = (((k * 37 + v * 19) % 11) - 5) * 1.6;
                  const sc = 0.94 + (((k * 13 + v * 7) % 7) / 7) * 0.14;
                  return (
                    <g key={k} transform={`rotate(${k * 72 + (v === 2 ? 36 : 0) + jitter}) scale(${sc})`}>
                      <use href={`#${u("p")}`} fill={`url(#${u("petal")})`} stroke="#f7a9c6" strokeWidth="0.18" opacity="0.97" />
                      <path d="M0 -0.8 L0 -5.6" stroke="#f1709f" strokeWidth="0.2" opacity="0.45" fill="none" />
                    </g>
                  );
                })}
                <circle r="1.05" fill="#d8437f" />
                {Array.from({ length: v === 1 ? 12 : 9 }, (_, k) => {
                  const a = (k / (v === 1 ? 12 : 9)) * Math.PI * 2 + v;
                  const len = 2.5 + (k % 3) * 0.5;
                  const x = n2(Math.cos(a) * len);
                  const y = n2(Math.sin(a) * len);
                  return (
                    <g key={k}>
                      <line x1={n2(Math.cos(a) * 0.8)} y1={n2(Math.sin(a) * 0.8)} x2={x} y2={y} stroke="#f4a0bf" strokeWidth="0.2" />
                      <circle cx={x} cy={y} r="0.33" fill={k % 4 === 0 ? "#d9574a" : "#efbd4f"} />
                    </g>
                  );
                })}
              </g>
            ))}
            <g id={u("bud")}>
              <path d="M0 0 C -2 -1.2 -2.2 -4.4 0 -6.6 C 2.2 -4.4 2 -1.2 0 0 Z" fill="#e8739f" stroke="#c84a80" strokeWidth="0.25" />
              <path d="M0 -2.6 C -1.1 -3.6 -1 -5.2 0 -6.6 C 1 -5.2 1.1 -3.6 0 -2.6 Z" fill="#fbc6da" opacity="0.8" />
            </g>
            <g id={u("leaf")}>
              <path d="M0 0 C -3.2 -2.6 -3 -7.6 0 -11.6 C 3 -7.6 3.2 -2.6 0 0 Z" fill="#a8603f" stroke="#7a3f2c" strokeWidth="0.3" />
              <path d="M0 -0.6 L0 -9.6" stroke="#d9a07a" strokeWidth="0.3" opacity="0.8" />
            </g>
          </defs>

          {/* limbs: tapering (three round-capped strokes of falling width), rough bark, pale flecks */}
          <g className="sakura-fade" style={{ animationDelay: `${delay}s` }} filter={`url(#${u("bark")})`} fill="none" strokeLinecap="round">
            {LIMBS.map((l, i) => (
              <g key={i}>
                <path d={l.d} pathLength={1} stroke="#3b2530" strokeWidth={l.w * 1.15} strokeDasharray="0.42 1" />
                <path d={l.d} pathLength={1} stroke="#3b2530" strokeWidth={l.w * 0.92} strokeDasharray="0.74 1" />
                <path d={l.d} pathLength={1} stroke="#3b2530" strokeWidth={l.w * 0.7} />
                <path d={l.d} pathLength={1} stroke="#7b5560" strokeWidth={Math.max(0.8, l.w * 0.2)} strokeOpacity="0.75" strokeDasharray="0.03 0.012 0.015 0.02" transform="translate(-0.8 -1)" />
              </g>
            ))}
          </g>

          {/* young leaves and buds */}
          <g className="sakura-fade" style={{ animationDelay: `${delay + 0.8}s` }}>
            {LEAVES.map(([x, y, rot], i) => (
              <use key={i} href={`#${u("leaf")}`} transform={`translate(${x} ${y}) rotate(${rot})`} />
            ))}
          </g>
          {buds.map((b, i) => (
            <g key={i} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.rot})`}>
              <use className="sakura-pop" href={`#${u("bud")}`} style={{ animationDelay: `${b.d.toFixed(2)}s` }} />
            </g>
          ))}

          {/* stalks */}
          <g stroke="#8c5560" strokeWidth="0.7" strokeLinecap="round" className="sakura-fade" style={{ animationDelay: `${delay + 0.6}s` }}>
            {flowers.map((f, i) => (
              <line key={i} x1={f.ax} y1={f.ay} x2={f.x} y2={f.y} />
            ))}
          </g>

          {/* sharp blossoms, with a soft shadow */}
          <g filter={`url(#${u("shadow")})`}>
            {flowers.map((f, i) => (
              <g key={i} transform={`translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.rot}) scale(${f.s.toFixed(2)} ${(f.tilt ? f.s * 0.6 : f.s).toFixed(2)})`}>
                <use className="sakura-pop" href={`#${u(`bl${f.v}`)}`} style={{ animationDelay: `${f.d.toFixed(2)}s` }} />
              </g>
            ))}
          </g>

          {/* big soft blossoms in front, out of focus */}
          <g filter={`url(#${u("soft")})`} opacity="0.9">
            {near.map(([x, y, s], i) => (
              <g key={i} transform={`translate(${x} ${y}) rotate(${i * 61}) scale(${s})`}>
                <use className="sakura-pop" href={`#${u(`bl${(i % 2) + 1}`)}`} style={{ animationDelay: `${delay + 2.4 + i * 0.3}s` }} />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
