import { useId } from "react";

// Soft clouds that drift across the sky and over Mount Fuji, in three layers
// that move at different speeds (far ones slowest) so the sky has depth.
//
// Each cloud is a cluster of ellipses roughened by an SVG noise filter, so the
// edges look fluffy and torn rather than like blobs. The filter is drawn once;
// after that only the layer's position changes (transform), so it is cheap.
// Each layer holds the same strip of sky twice and slides by exactly one strip,
// so the loop never shows a seam. Used inside `.atm-anim`, which stops the
// drifting when the tab is hidden and for visitors who ask for less motion
// (the clouds then simply stay where they are).

const TILE = 1200;

// Tiny seeded generator — the same clouds every render, on server and client.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Cloud = { x: number; y: number; w: number };

function puffs(c: Cloud, seed: number) {
  const r = rng(seed);
  const out: { cx: number; cy: number; rx: number; ry: number }[] = [];
  // A flat, wide base and several rounder puffs along it.
  out.push({ cx: c.x, cy: c.y + c.w * 0.05, rx: c.w * 0.5, ry: c.w * 0.09 });
  for (let i = 0; i < 6; i++) {
    const rx = c.w * (0.14 + r() * 0.13);
    out.push({ cx: c.x + (r() - 0.5) * c.w * 0.8, cy: c.y - r() * c.w * 0.06, rx, ry: rx * (0.45 + r() * 0.2) });
  }
  return out;
}

const LAYERS: {
  key: string;
  top: string;
  height: string;
  duration: number;
  delay: number;
  opacity: number;
  blur: number;
  clouds: Cloud[];
  seed: number;
}[] = [
  // far: small, high, slow, faint
  { key: "far", top: "2%", height: "22%", duration: 190, delay: -60, opacity: 0.4, blur: 5, seed: 11, clouds: [{ x: 160, y: 190, w: 300 }, { x: 560, y: 120, w: 240 }, { x: 930, y: 220, w: 330 }] },
  // middle: across the upper sky
  { key: "mid", top: "10%", height: "30%", duration: 120, delay: -40, opacity: 0.45, blur: 7, seed: 23, clouds: [{ x: 300, y: 200, w: 480 }, { x: 860, y: 160, w: 420 }] },
  // near: a long low band that crosses the mountain's flank
  { key: "near", top: "32%", height: "26%", duration: 80, delay: -25, opacity: 0.32, blur: 10, seed: 37, clouds: [{ x: 220, y: 210, w: 640 }, { x: 900, y: 190, w: 560 }] },
];

export default function SkyClouds() {
  const id = useId();
  return (
    <>
      {LAYERS.map((layer) => {
        const fid = `${id}-${layer.key}`;
        const group = layer.clouds.flatMap((c, ci) => puffs(c, layer.seed + ci * 7));
        return (
          <div key={layer.key} aria-hidden="true" className="absolute inset-x-0 overflow-hidden" style={{ top: layer.top, height: layer.height, opacity: layer.opacity }}>
            <svg
              viewBox={`0 0 ${TILE * 2} 400`}
              preserveAspectRatio="none"
              className="sky-drift h-full w-[200%] max-w-none"
              style={{ animationDuration: `${layer.duration}s`, animationDelay: `${layer.delay}s` }}
            >
              <defs>
                <filter id={fid} x="-10%" y="-60%" width="120%" height="220%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.009 0.022" numOctaves="4" seed={layer.seed} result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="70" xChannelSelector="R" yChannelSelector="G" result="rough" />
                  <feGaussianBlur in="rough" stdDeviation={layer.blur} />
                </filter>
                <radialGradient id={`${fid}-puff`}>
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="0.55" stopColor="#ffeaf4" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#ffd9ea" stopOpacity="0" />
                </radialGradient>
                <g id={`${fid}-tile`} fill={`url(#${fid}-puff)`}>
                  {group.map((p, i) => (
                    <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx * 1.25} ry={p.ry * 1.35} />
                  ))}
                </g>
              </defs>
              <g filter={`url(#${fid})`}>
                <use href={`#${fid}-tile`} />
                <use href={`#${fid}-tile`} x={TILE} />
              </g>
            </svg>
          </div>
        );
      })}
    </>
  );
}
