import type { CSSProperties } from "react";

// The living parts of the sign-in scenery. Everything here sits inside `.auth-scene` (see FujiBackdrop), a box that is the
// photograph's own size and position, so a fraction of it always lands on the same spot of the picture: the cherry trees stand
// on the wooded hillside at the left, their reflections lie in the lake, and the ripples, glints and mist belong to the water
// and the valley in front of Mount Fuji.
//
// The trees are three small transparent pictures (public/images/sakura/tree-*.webp, made by scripts/render-sakura-trees.mjs),
// reused at different sizes and mirrored, in three rows from the ridge down to the shore. Each sways on its own slow beat; only
// transform and opacity ever animate. All of it is decorative (aria-hidden), takes no clicks, stops while the tab is hidden
// (html[data-atm-paused]) and stands still for visitors who ask for less motion (see globals.css, "Sign-in scenery").

type Variant = "a" | "b" | "c";
// x, y: where the foot of the trunk stands, as a fraction of the photograph (y measured down from its top); w: crown width as a
// fraction of the photograph's width. The waterline is at about 0.535.
type Tree = { v: Variant; x: number; y: number; w: number; flip?: boolean; dur: number; delay: number; amp: number };

const WATER = 0.535;

// Where the ridge of the wooded hill runs across the photograph (fraction of its height at a given fraction of its width), so each
// tree can be stood so that its crown just reaches the ridge. A tree's crown is about 1.22 x its width tall (the picture is 1000 x 690).
const RIDGE: [number, number][] = [[0, 0.328], [0.1, 0.337], [0.2, 0.36], [0.3, 0.417], [0.36, 0.469], [0.4, 0.51]];
function ridge(x: number) {
  for (let i = 1; i < RIDGE.length; i++) {
    const [x1, y1] = RIDGE[i];
    const [x0, y0] = RIDGE[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return RIDGE[RIDGE.length - 1][1];
}
const CROWN = 0.99;
const stand = (v: Variant, x: number, w: number, lift: number, o: Partial<Tree> = {}): Tree => ({
  v, x, w, y: Math.min(WATER, ridge(x) + CROWN * w + lift), dur: 6.6 + ((x * 97) % 2.6), delay: -((x * 131) % 8), amp: 0.8 + ((x * 53) % 0.6), flip: ((x * 1000) | 0) % 2 === 0, ...o,
});
const V: Variant[] = ["a", "b", "c"];
const row = (xs: number[], ws: number[], lift: number, seed: number) => xs.map((x, i) => stand(V[(i + seed) % 3], x, ws[i], lift));

// Three rows from the ridge down to the shore: the back row's crowns just reach the ridge and are hazier, the middle row stands
// lower and the front row at the water's edge.
const BACK = row([0.02, 0.085, 0.15, 0.215, 0.28, 0.335, 0.38], [0.1, 0.1, 0.1, 0.095, 0.088, 0.076, 0.064], -0.005, 0);
const MID = row([0.0, 0.065, 0.13, 0.2, 0.265, 0.32, 0.365], [0.125, 0.125, 0.118, 0.11, 0.1, 0.088, 0.07], 0.04, 1);
const FRONT = row([0.035, 0.11, 0.19, 0.265, 0.33], [0.14, 0.135, 0.12, 0.105, 0.08], 1, 2);

function TreeImg({ t, still }: { t: Tree; still?: boolean }) {
  return (
    <div className="auth-tree" style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, width: `${t.w * 100}%`, scale: t.flip ? "-1 1" : undefined }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/sakura/tree-${t.v}.webp`}
        alt=""
        draggable={false}
        decoding="async"
        className={still ? "auth-tree__img" : "auth-tree__img auth-tree__sway"}
        style={still ? undefined : ({ animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s`, "--amp": t.amp } as CSSProperties)}
      />
    </div>
  );
}

// A handful of petals blown off the trees, drifting out over the lake: start (fraction of the photograph), how far they travel
// (in hundredths of its width) and how long it takes.
const WIND_PETALS = [
  { x: 0.2, y: 0.42, dx: 22, dy: 20, dur: 15, delay: -2, size: 11 },
  { x: 0.12, y: 0.47, dx: 26, dy: 26, dur: 19, delay: -9, size: 9 },
  { x: 0.28, y: 0.5, dx: 20, dy: 18, dur: 14, delay: -5, size: 12 },
  { x: 0.07, y: 0.4, dx: 30, dy: 30, dur: 21, delay: -13, size: 10 },
  { x: 0.33, y: 0.46, dx: 18, dy: 22, dur: 17, delay: -7, size: 9 },
];

// Light glints on the water, mostly under the mountain: x, y (fraction of the lake), length and beat.
const GLINTS = [
  { x: 0.46, y: 0.18, w: 70, dur: 5.2, delay: -1 },
  { x: 0.55, y: 0.3, w: 110, dur: 6.4, delay: -3 },
  { x: 0.5, y: 0.46, w: 90, dur: 5.8, delay: -2 },
  { x: 0.6, y: 0.58, w: 130, dur: 7.1, delay: -5 },
  { x: 0.42, y: 0.66, w: 100, dur: 6.1, delay: -4 },
  { x: 0.53, y: 0.78, w: 150, dur: 6.8, delay: -6 },
  { x: 0.66, y: 0.42, w: 60, dur: 5.5, delay: -2 },
  { x: 0.34, y: 0.5, w: 70, dur: 6.6, delay: -7 },
  { x: 0.7, y: 0.72, w: 120, dur: 7.4, delay: -1 },
  { x: 0.24, y: 0.7, w: 90, dur: 6.2, delay: -5 },
];

function Ripples({ id }: { id: string }) {
  // Long thin streaks of light made from stretched noise, drawn once and then only slid sideways, one layer finer and slower
  // (far water) and one broader and quicker (near water).
  const layer = (key: string, freq: string, seed: number, cls: string) => (
    <svg key={key} aria-hidden="true" viewBox="0 0 2000 300" preserveAspectRatio="none" className={`auth-ripple ${cls}`}>
      <filter id={`${id}-${key}`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="2" seed={seed} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.93  0 0 0 0 0.9  0 0 0 0 1  0 0 0 2.9 -1.42" />
      </filter>
      <rect width="2000" height="300" filter={`url(#${id}-${key})`} />
    </svg>
  );
  return (
    <>
      {layer("far", "0.0016 0.11", 4, "auth-ripple--far")}
      {layer("near", "0.0024 0.05", 9, "auth-ripple--near")}
    </>
  );
}

export default function SceneLife({ id }: { id: string }) {
  return (
    <>
      {/* The trees in their reflection first (under everything): the same trees turned over about the waterline, dim, soft,
          and swaying a little as the water moves. */}
      <div aria-hidden="true" className="auth-reflect" style={{ transformOrigin: `50% ${WATER * 100}%` }}>
        <div className="auth-reflect__move">
          {[...MID, ...FRONT].map((t, i) => (
            <TreeImg key={i} t={t} still />
          ))}
        </div>
      </div>

      {/* The lake: ripples sliding across it, glints that come and go, and a slow sheen of light. */}
      <div aria-hidden="true" className="auth-lake" style={{ top: `${WATER * 100}%` }}>
        <Ripples id={id} />
        <span className="auth-sheen-band" />
        {GLINTS.map((g, i) => (
          <span key={i} className="auth-glint" style={{ left: `${g.x * 100}%`, top: `${g.y * 100}%`, width: g.w, animationDuration: `${g.dur}s`, animationDelay: `${g.delay}s` }} />
        ))}
      </div>

      {/* Mist in the valley, drifting slowly in two directions at different heights. */}
      <div aria-hidden="true" className="auth-mist auth-mist--a" />
      <div aria-hidden="true" className="auth-mist auth-mist--b" />

      {/* The hillside, from the ridge down to the shore: three rows, with a veil of haze after the back row. */}
      <div aria-hidden="true" className="auth-trees auth-trees--back">
        {BACK.map((t, i) => (
          <TreeImg key={i} t={t} />
        ))}
      </div>
      <div aria-hidden="true" className="auth-haze" />
      <div aria-hidden="true" className="auth-trees auth-trees--mid">
        {MID.map((t, i) => (
          <TreeImg key={i} t={t} />
        ))}
      </div>
      <div aria-hidden="true" className="auth-trees auth-trees--front">
        {FRONT.map((t, i) => (
          <TreeImg key={i} t={t} />
        ))}
      </div>

      <div aria-hidden="true" className="auth-hill-shade" />

      {/* Petals the wind lifts from the blossoms and carries out over the water. */}
      {WIND_PETALS.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="auth-wind-petal"
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: p.size, height: p.size * 1.25, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, "--dx": `${p.dx}cqw`, "--dy": `${p.dy}cqw` } as CSSProperties}
        />
      ))}
    </>
  );
}
