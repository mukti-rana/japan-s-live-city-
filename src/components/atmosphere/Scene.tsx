import type { CSSProperties } from "react";
import type { Art, Particle, WeatherLayer } from "@/lib/atmosphere/resolve";

// One LIVE CITY ATMOSPHERE scene: an original illustrated landscape (inline
// SVG, no image files, no video) with light, cheap CSS particles on top. Every
// position is fixed rather than random, so the server and the browser draw
// the same thing, and only transform/opacity are animated. The page's own
// background colour is laid over the scene (`veil`) so text stays readable.

const SKY: Record<Art, string> = {
  sakura: "linear-gradient(180deg,#26163d 0%,#4d2552 45%,#b4577e 82%,#e89a8f 100%)",
  neon: "linear-gradient(180deg,#050819 0%,#10103a 50%,#2b1363 88%,#44197a 100%)",
  autumn: "linear-gradient(180deg,#24120a 0%,#5a2812 48%,#c2662b 86%,#f0a24e 100%)",
  fuji: "linear-gradient(180deg,#06112b 0%,#102a5c 50%,#2b5d98 88%,#8db6d9 100%)",
  matsuri: "linear-gradient(180deg,#10072a 0%,#2a0f3b 48%,#6a2142 85%,#b24a3d 100%)",
};

// A ~20-item deterministic scatter: x %, delay s, duration s, size px, sway px.
const SCATTER = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  delay: -((i * 1.9) % 13),
  dur: 12 + ((i * 3) % 8),
  size: 7 + ((i * 5) % 9),
  dx: ((i * 13) % 56) - 28,
}));

const RAIN = Array.from({ length: 28 }, (_, i) => ({ x: (i * 29 + 5) % 100, delay: -((i * 0.37) % 1.6), dur: 0.9 + ((i * 7) % 6) / 10 }));

function Fuji({ snow = "#eef4ff", body = "#1a2e57", cap = true }: { snow?: string; body?: string; cap?: boolean }) {
  return (
    <>
      <path d="M260 640 C 560 610 790 340 936 262 L1024 262 C 1170 340 1390 610 1700 640 Z" fill={body} />
      {cap && <path d="M905 300 L936 262 L1024 262 L1056 302 L1016 286 L992 316 L966 290 L938 312 Z" fill={snow} opacity="0.92" />}
    </>
  );
}

function Skyline() {
  // [x, width, height]
  const b: [number, number, number][] = [[0, 90, 180], [96, 70, 260], [172, 110, 210], [290, 64, 330], [360, 120, 240], [486, 80, 300], [572, 130, 200], [708, 70, 360], [784, 100, 260], [890, 76, 310], [972, 120, 220], [1100, 84, 340], [1190, 110, 250], [1306, 134, 200]];
  return (
    <g>
      {b.map(([x, w, h], i) => (
        <g key={i}>
          <rect x={x} y={640 - h} width={w} height={h} fill="#0a0d2a" />
          {Array.from({ length: Math.floor(h / 34) }, (_, r) =>
            Array.from({ length: Math.floor(w / 22) }, (_, c) =>
              (i * 7 + r * 5 + c * 3) % 4 === 0 ? <rect key={`${r}-${c}`} x={x + 8 + c * 22} y={640 - h + 14 + r * 34} width="8" height="12" fill={(r + c + i) % 5 === 0 ? "#ffd27a" : "#7fd3ff"} opacity="0.75" className="atm-win" style={{ animationDelay: `${-((r * 3 + c * 5 + i) % 9)}s` }} /> : null,
            ),
          )}
        </g>
      ))}
      {/* A red lattice tower and neon signs */}
      <path d="M1000 640 L1030 330 L1040 330 L1070 640 M1012 560 L1058 560 M1018 470 L1052 470 M1024 400 L1046 400" stroke="#ff5c3a" strokeWidth="5" fill="none" />
      <rect x="100" y="470" width="62" height="14" rx="4" fill="#ff3ea5" className="atm-neon" />
      <rect x="610" y="520" width="80" height="12" rx="4" fill="#22d3ee" className="atm-neon" style={{ animationDelay: "-2s" }} />
      <rect x="1230" y="500" width="70" height="12" rx="4" fill="#a855f7" className="atm-neon" style={{ animationDelay: "-4s" }} />
    </g>
  );
}

function Pagoda({ x, scale = 1 }: { x: number; scale?: number }) {
  const tiers = [0, 1, 2, 3, 4];
  return (
    <g transform={`translate(${x} 640) scale(${scale})`} fill="#1c0d09">
      <rect x="-14" y="-420" width="28" height="420" />
      {tiers.map((t) => {
        const w = 150 - t * 22;
        const y = -(t + 1) * 76;
        return <path key={t} d={`M${-w} ${y + 22} Q 0 ${y - 22} ${w} ${y + 22} L ${w - 22} ${y + 38} L ${-w + 22} ${y + 38} Z`} />;
      })}
      <rect x="-3" y="-470" width="6" height="60" />
    </g>
  );
}

function Torii({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 640)`} fill="#2a0f08">
      <rect x="-70" y="-220" width="16" height="220" />
      <rect x="54" y="-220" width="16" height="220" />
      <path d="M-100 -226 Q 0 -262 100 -226 L 100 -208 L -100 -208 Z" />
      <rect x="-84" y="-176" width="168" height="12" />
    </g>
  );
}

function Lanterns() {
  const xs = Array.from({ length: 13 }, (_, i) => i * 120);
  return (
    <g>
      <path d="M-20 70 Q 360 150 720 70 T 1460 70" stroke="#3a1a20" strokeWidth="3" fill="none" />
      {xs.map((x, i) => {
        const y = 78 + Math.sin(((x / 720) * Math.PI) * 2) * 38 + 26;
        return (
          <g key={x} transform={`translate(${x} ${y})`} className="atm-lantern" style={{ animationDelay: `${-((i * 1.3) % 6)}s` }}>
            <circle r="46" fill="url(#atm-lant-glow)" />
            <rect x="-14" y="-18" width="28" height="36" rx="12" fill={i % 3 === 0 ? "#ff7a3c" : "#e8382f"} />
            <rect x="-8" y="-22" width="16" height="6" fill="#2a0f08" />
            <rect x="-8" y="16" width="16" height="6" fill="#2a0f08" />
          </g>
        );
      })}
    </g>
  );
}

function Yagura() {
  return (
    <g transform="translate(300 640)" fill="#1a0a14">
      <rect x="-90" y="-150" width="12" height="150" />
      <rect x="78" y="-150" width="12" height="150" />
      <rect x="-110" y="-180" width="220" height="34" />
      <path d="M-130 -178 L0 -236 L130 -178 Z" />
      <rect x="-6" y="-150" width="12" height="150" />
    </g>
  );
}

function Branch({ left = false, color }: { left?: boolean; color: "pink" | "maple" }) {
  const tones = color === "pink" ? ["#ffc2d8", "#ff9fc2", "#ffe0ec"] : ["#d8331f", "#f0702a", "#ffb03b"];
  const pts = [[60, 60], [120, 110], [190, 90], [250, 150], [320, 130], [90, 150], [170, 40], [300, 70], [220, 200], [140, 210]];
  return (
    <g transform={left ? "translate(0 0)" : "translate(1440 0) scale(-1 1)"} opacity="0.92">
      <path d="M-10 30 C 120 70 200 80 340 190" stroke="#2a1410" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M150 74 C 200 40 240 30 300 40" stroke="#2a1410" strokeWidth="5" fill="none" strokeLinecap="round" />
      {pts.map(([x, y], i) =>
        color === "pink" ? <circle key={i} cx={x} cy={y} r={14 + (i % 3) * 4} fill={tones[i % 3]} opacity="0.85" /> : <path key={i} d={`M${x} ${y - 16} L${x + 7} ${y - 4} L${x + 16} ${y - 6} L${x + 8} ${y + 4} L${x + 12} ${y + 16} L${x} ${y + 9} L${x - 12} ${y + 16} L${x - 8} ${y + 4} L${x - 16} ${y - 6} L${x - 7} ${y - 4} Z`} fill={tones[i % 3]} opacity="0.9" />,
      )}
    </g>
  );
}

function Art({ art }: { art: Art }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 640" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-full w-full">
      <defs>
        <radialGradient id="atm-lant-glow">
          <stop offset="0" stopColor="#ff9a4d" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ff9a4d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="atm-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {art === "sakura" && (
        <>
          <circle cx="860" cy="300" r="120" fill="#ffd9c4" opacity="0.28" />
          <Fuji body="#43285f" snow="#ffe9ee" />
          <path d="M0 640 L0 590 Q 400 560 800 600 T 1440 585 L1440 640 Z" fill="#241034" />
          <Branch left color="pink" />
          <Branch color="pink" />
        </>
      )}
      {art === "fuji" && (
        <>
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={(i * 97 + 30) % 1440} cy={(i * 53) % 260 + 20} r={i % 4 === 0 ? 2.2 : 1.4} fill="#fff" opacity="0.75" className="atm-win" style={{ animationDelay: `${-(i % 9)}s` }} />
          ))}
          <Fuji body="#16305f" snow="#f4f8ff" />
          <path d="M0 640 L0 600 Q 500 585 900 606 T 1440 596 L1440 640 Z" fill="#0b1a3b" />
          <rect x="0" y="606" width="1440" height="34" fill="url(#atm-ground)" />
        </>
      )}
      {art === "autumn" && (
        <>
          <circle cx="1080" cy="250" r="110" fill="#ffc27a" opacity="0.3" />
          <path d="M0 640 L0 540 Q 300 470 620 560 T 1440 520 L1440 640 Z" fill="#2a120c" opacity="0.9" />
          <Pagoda x={1010} scale={0.9} />
          <Torii x={380} />
          <path d="M0 640 L0 598 Q 480 575 960 606 T 1440 590 L1440 640 Z" fill="#1c0d09" />
          <Branch left color="maple" />
          <Branch color="maple" />
        </>
      )}
      {art === "neon" && (
        <>
          <Skyline />
          <rect x="0" y="560" width="1440" height="80" fill="url(#atm-ground)" />
        </>
      )}
      {art === "matsuri" && (
        <>
          <circle cx="720" cy="470" r="260" fill="#ff8a4d" opacity="0.14" />
          <Yagura />
          <path d="M0 640 L0 590 Q 480 570 960 600 T 1440 586 L1440 640 Z" fill="#14070f" />
          {[820, 940, 1060, 1180].map((x) => (
            <g key={x} transform={`translate(${x} 640)`} fill="#1a0a14">
              <path d="M-44 -70 L0 -100 L44 -70 Z" />
              <rect x="-40" y="-70" width="80" height="70" />
              <rect x="-24" y="-48" width="48" height="18" fill="#ff9a4d" opacity="0.5" className="atm-neon" />
            </g>
          ))}
          <Lanterns />
        </>
      )}
    </svg>
  );
}

function Particles({ kind, density }: { kind: Particle; density: number }) {
  const n = Math.max(0, Math.round(SCATTER.length * density));
  return (
    <>
      {SCATTER.slice(0, n).map((p, i) => {
        const style = { left: `${p.x}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, "--dx": `${p.dx}px` } as CSSProperties;
        if (kind === "cityLights") {
          return <span key={i} className={`atm-twinkle absolute rounded-full ${i >= 10 ? "max-sm:hidden" : ""}`} style={{ left: `${p.x}%`, top: `${40 + ((i * 17) % 50)}%`, width: 3, height: 3, background: i % 2 ? "#7fd3ff" : "#ff7ad1", animationDelay: `${p.delay}s`, animationDuration: `${3 + (i % 4)}s` }} />;
        }
        if (kind === "sparkles") {
          return <span key={i} className={`atm-rise absolute rounded-full bg-[#ffd9a0] ${i >= 10 ? "max-sm:hidden" : ""}`} style={{ ...style, bottom: 0, width: p.size / 2.4, height: p.size / 2.4, boxShadow: "0 0 10px 3px rgba(255,190,110,0.6)" }} />;
        }
        return (
          <span key={i} className={`atm-fall absolute top-0 block ${i >= 10 ? "max-sm:hidden" : ""}`} style={style}>
            <span className={`atm-sway block h-full w-full ${kind === "petals" ? "atm-petal" : kind === "leaves" ? "atm-leaf" : "atm-flake"}`} style={{ animationDuration: `${3 + (i % 4)}s`, animationDelay: `${p.delay}s` }} />
          </span>
        );
      })}
    </>
  );
}

function Weather({ kind }: { kind: WeatherLayer }) {
  if (kind === "rain") {
    return (
      <>
        <div className="absolute inset-0 bg-[#0b1230]/25" />
        {RAIN.map((r, i) => (
          <span key={i} className="atm-rain absolute top-0 block h-12 w-px bg-gradient-to-b from-transparent to-sky-200/50" style={{ left: `${r.x}%`, animationDelay: `${r.delay}s`, animationDuration: `${r.dur}s` }} />
        ))}
      </>
    );
  }
  if (kind === "clouds") {
    return (
      <>
        <span className="atm-cloud absolute left-[6%] top-[8%] h-24 w-[44%] rounded-full bg-slate-100/10 blur-3xl" style={{ animationDuration: "60s" }} />
        <span className="atm-cloud absolute left-[46%] top-[20%] h-20 w-[48%] rounded-full bg-slate-200/10 blur-3xl" style={{ animationDuration: "75s", animationDelay: "-20s" }} />
      </>
    );
  }
  if (kind === "sun") return <span className="atm-sun absolute -right-[6%] -top-[14%] h-[60%] w-[46%] rounded-full bg-[radial-gradient(circle,rgba(255,214,140,0.5)_0%,rgba(255,190,110,0.14)_45%,transparent_70%)]" />;
  return null; // snow is drawn as particles
}

function Fireworks() {
  const bursts = [{ x: 22, y: 22, c: "#ff8ad8", d: 0 }, { x: 68, y: 16, c: "#7fd3ff", d: -6 }, { x: 46, y: 30, c: "#ffd27a", d: -11 }];
  return (
    <>
      {bursts.map((b) => (
        <svg key={b.x} aria-hidden="true" viewBox="-50 -50 100 100" className="atm-burst absolute h-40 w-40" style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${b.d}s` }}>
          {Array.from({ length: 16 }, (_, i) => (
            <line key={i} x1="0" y1="-14" x2="0" y2="-40" stroke={b.c} strokeWidth="2" strokeLinecap="round" transform={`rotate(${i * 22.5})`} />
          ))}
        </svg>
      ))}
    </>
  );
}

export default function Scene({
  art,
  particle,
  weather,
  fireworks,
  animate,
  density,
  veil,
  className = "",
}: {
  art: Art;
  particle: Particle | null;
  weather: WeatherLayer | null;
  fireworks: boolean;
  animate: boolean;
  density: number;
  veil: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`atm-root atm-anim pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ background: SKY[art] }}>
      <Art art={art} />
      {animate && weather && <Weather kind={weather} />}
      {animate && particle && <Particles kind={particle} density={density} />}
      {animate && fireworks && <Fireworks />}
      {/* The page's own colour over the scene keeps everything readable. */}
      <div className="absolute inset-0" style={{ background: `color-mix(in srgb, var(--background) ${Math.round(veil * 100)}%, transparent)` }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--background)_130%)]" />
    </div>
  );
}
