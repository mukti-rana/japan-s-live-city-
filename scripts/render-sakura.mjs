// Renders the cherry-blossom branch pictures used on the sign-in page.
//
//   node scripts/render-sakura.mjs        (or: npm run sakura:render)
//
// It draws each branch as layered vector artwork (bark, leaves, stalks and
// blossoms with notched translucent petals, veins and pollen-tipped stamens),
// then finishes it like a photograph: a soft contact shadow under the
// blossoms, out-of-focus blossoms in front, a touch of light from the top left
// and slightly calmer colour. The result is a small transparent WebP in
// public/images/sakura/ — nothing is downloaded and nothing is paid for.
//
// The pictures are committed, so this only needs to run when the artwork is
// changed. (`sharp` is already installed because Next.js uses it.)

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/images/sakura");
fs.mkdirSync(OUT, { recursive: true });

// Branch geometry in a 400 x 300 box rooted at the top-left corner, drawn with
// a margin so blossoms near the edge are not clipped.
const VB = { x: -24, y: -24, w: 448, h: 348 };

const LIMBS = [
  { d: "M-14 -10 C 50 18 100 26 150 62 S 240 110 285 112 S 340 150 374 166", w: 11 },
  { d: "M96 30 C 108 62 98 98 112 130 S 120 150 118 168", w: 5.5 },
  { d: "M150 62 C 160 40 176 24 206 14", w: 4.5 },
  { d: "M230 92 C 250 70 262 56 292 50", w: 4 },
  { d: "M270 112 C 280 140 276 168 292 198 S 296 214 294 230", w: 4 },
  { d: "M38 12 C 50 36 44 58 56 82", w: 3.5 },
  { d: "M318 140 C 336 130 352 134 380 120", w: 3 },
  { d: "M190 82 C 200 104 192 126 204 146", w: 3 },
];
const ANCHORS = [
  [48, 26], [78, 40], [108, 46], [104, 88], [112, 126], [118, 162], [150, 58], [178, 38], [206, 16], [190, 86], [204, 144],
  [238, 90], [264, 66], [292, 52], [272, 118], [286, 176], [294, 218], [324, 138], [354, 132], [376, 162], [242, 114], [332, 152],
  [60, 82], [44, 58],
];
const LEAVES = [
  [130, 56, -40], [168, 70, 30], [214, 100, 60], [246, 104, -30], [282, 124, 40], [306, 146, -20], [96, 44, -70], [74, 52, -120], [200, 20, -25], [286, 42, -60],
];

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const f2 = (v) => Math.round(v * 100) / 100;

const PETAL = "M0 0 C -2.6 -1 -4.6 -4.6 -3.3 -7.1 C -2.6 -8.4 -1.1 -8.4 0 -7.2 C 1.1 -8.4 2.6 -8.4 3.3 -7.1 C 4.6 -4.6 2.6 -1 0 0 Z";

function blossomDefs() {
  const variant = (v) => {
    const petals = [0, 1, 2, 3, 4]
      .map((k) => {
        const jitter = (((k * 37 + v * 19) % 11) - 5) * 1.6;
        const sc = 0.94 + (((k * 13 + v * 7) % 7) / 7) * 0.14;
        return `<g transform="rotate(${k * 72 + (v === 2 ? 36 : 0) + jitter}) scale(${sc})">
          <use href="#p" fill="url(#petalfill)" stroke="#f3a3c2" stroke-width="0.18" opacity="0.97"/>
          <path d="M0 -0.8 L0 -5.6" stroke="#ee6f9c" stroke-width="0.2" opacity="0.4" fill="none"/>
        </g>`;
      })
      .join("");
    const count = v === 1 ? 12 : 9;
    const stamens = Array.from({ length: count }, (_, k) => {
      const a = (k / count) * Math.PI * 2 + v;
      const len = 2.5 + (k % 3) * 0.5;
      const x = f2(Math.cos(a) * len);
      const y = f2(Math.sin(a) * len);
      return `<line x1="${f2(Math.cos(a) * 0.8)}" y1="${f2(Math.sin(a) * 0.8)}" x2="${x}" y2="${y}" stroke="#f2a0be" stroke-width="0.2"/>
        <circle cx="${x}" cy="${y}" r="0.33" fill="${k % 4 === 0 ? "#d4574c" : "#e9b54a"}"/>`;
    }).join("");
    return `<g id="bl${v}">${petals}<circle r="1.05" fill="#d4467f"/>${stamens}</g>`;
  };
  return `
    <radialGradient id="petalfill" cx="0.5" cy="1" r="1.05">
      <stop offset="0" stop-color="#e65f93"/><stop offset="0.22" stop-color="#f7a0c1"/>
      <stop offset="0.6" stop-color="#fbd7e5"/><stop offset="1" stop-color="#fdf4f8"/>
    </radialGradient>
    <path id="p" d="${PETAL}"/>
    ${variant(1)}${variant(2)}
    <g id="bud">
      <path d="M0 0 C -2 -1.2 -2.2 -4.4 0 -6.6 C 2.2 -4.4 2 -1.2 0 0 Z" fill="#df729c" stroke="#bd4a7d" stroke-width="0.25"/>
      <path d="M0 -2.6 C -1.1 -3.6 -1 -5.2 0 -6.6 C 1 -5.2 1.1 -3.6 0 -2.6 Z" fill="#f6c3d8" opacity="0.8"/>
    </g>
    <g id="leaf">
      <path d="M0 0 C -3.2 -2.6 -3 -7.6 0 -11.6 C 3 -7.6 3.2 -2.6 0 0 Z" fill="#9c5a3c" stroke="#74402c" stroke-width="0.3"/>
      <path d="M0 -0.6 L0 -9.6" stroke="#cf9d78" stroke-width="0.3" opacity="0.75"/>
    </g>`;
}

function wrap(inner, W, extraDefs = "") {
  const H = Math.round((W * VB.h) / VB.w);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}"><defs>${blossomDefs()}${extraDefs}</defs>${inner}</svg>`;
}

function layout(seed, anchorCount) {
  const r = rng(seed);
  const anchors = ANCHORS.slice(0, anchorCount);
  const flowers = [];
  anchors.forEach(([ax, ay]) => {
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2;
      const dist = 7 + r() * 11;
      flowers.push({
        ax, ay,
        x: f2(ax + Math.cos(a) * dist),
        y: f2(ay + Math.sin(a) * dist * 0.8),
        s: 0.8 + r() * 0.55,
        rot: Math.round(r() * 360),
        tilt: r() < 0.25,
        v: r() < 0.5 ? 1 : 2,
      });
    }
  });
  const buds = Array.from({ length: 7 }, () => {
    const [ax, ay] = anchors[Math.floor(r() * anchors.length)];
    return { x: f2(ax + (r() - 0.5) * 22), y: f2(ay + (r() - 0.5) * 18), rot: Math.round(r() * 360) };
  });
  return { flowers, buds, anchors };
}

function barkSvg(W, seed, L) {
  const limbs = LIMBS.map((l) => {
    const c = "#3a2530";
    return `<path d="${l.d}" pathLength="1" stroke="${c}" stroke-width="${l.w * 1.15}" stroke-dasharray="0.42 1"/>
      <path d="${l.d}" pathLength="1" stroke="${c}" stroke-width="${l.w * 0.92}" stroke-dasharray="0.74 1"/>
      <path d="${l.d}" pathLength="1" stroke="${c}" stroke-width="${l.w * 0.7}"/>
      <path d="${l.d}" pathLength="1" stroke="#6d4a55" stroke-width="${Math.max(0.7, l.w * 0.16)}" stroke-opacity="0.55" transform="translate(-0.9 -1)"/>`;
  }).join("");
  const leaves = LEAVES.map(([x, y, rot]) => `<use href="#leaf" transform="translate(${x} ${y}) rotate(${rot})"/>`).join("");
  const buds = L.buds.map((b) => `<g transform="translate(${b.x} ${b.y}) rotate(${b.rot})"><use href="#bud"/></g>`).join("");
  const stalks = L.flowers.map((f) => `<line x1="${f.ax}" y1="${f.ay}" x2="${f.x}" y2="${f.y}"/>`).join("");
  const filter = `<filter id="bark" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="3" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  return wrap(
    `<g filter="url(#bark)" fill="none" stroke-linecap="round">${limbs}</g>
     <g>${leaves}</g>${buds}
     <g stroke="#86505c" stroke-width="0.7" stroke-linecap="round">${stalks}</g>`,
    W,
    filter,
  );
}

function blossomSvg(W, L) {
  const flowers = L.flowers
    .map((f) => `<g transform="translate(${f.x} ${f.y}) rotate(${f.rot}) scale(${f2(f.s)} ${f2(f.tilt ? f.s * 0.6 : f.s)})"><use href="#bl${f.v}"/></g>`)
    .join("");
  return wrap(flowers, W);
}

function bokehSvg(W, spots) {
  const g = spots.map(([x, y, s], i) => `<g transform="translate(${x} ${y}) rotate(${i * 61}) scale(${s})"><use href="#bl${(i % 2) + 1}"/></g>`).join("");
  return wrap(g, W);
}

async function render(name, { W, seed, anchorCount, bokeh }) {
  const L = layout(seed, anchorCount);
  const png = (svg) => sharp(Buffer.from(svg), { density: 72 }).png().toBuffer();
  const k = W / VB.w; // pixels per unit

  const bark = await png(barkSvg(W, seed, L));
  const blossoms = await png(blossomSvg(W, L));
  const near = await sharp(await png(bokehSvg(W, bokeh))).blur(1.6 * (W / 1400) + 0.3).toBuffer();

  // A soft contact shadow under the sharp blossoms: their silhouette, blurred,
  // darkened, made faint, and nudged down.
  const shadow = await sharp(blossoms)
    .blur(1.4 * k * 0.5 + 0.3)
    .modulate({ brightness: 0 })
    .linear([1, 1, 1, 0.38], [0, 0, 0, 0])
    .toBuffer();
  const H = Math.round((W * VB.h) / VB.w);

  let img = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: bark, blend: "over" },
      { input: shadow, blend: "over", top: Math.round(k * 0.9), left: 0 },
      { input: blossoms, blend: "over" },
      { input: near, blend: "over" },
    ])
    .png()
    .toBuffer();

  // Light from the top left and cooler shade towards the bottom right, painted
  // only where the branch is (blend "atop" keeps the transparent areas clear).
  const light = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="l" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff3e6" stop-opacity="0.16"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#2a2150" stop-opacity="0.22"/>
    </linearGradient></defs><rect width="${W}" height="${H}" fill="url(#l)"/></svg>`,
  );
  img = await sharp(img).composite([{ input: light, blend: "atop" }]).toBuffer();

  const file = path.join(OUT, `${name}.webp`);
  await sharp(img).modulate({ saturation: 0.9 }).webp({ quality: 80, alphaQuality: 88, effort: 6 }).toFile(file);
  console.log(name, `${W}x${H}`, `${Math.round(fs.statSync(file).size / 1024)} KB`);
}

await render("branch-large", { W: 1400, seed: 3, anchorCount: 24, bokeh: [[16, 40, 2.3], [352, 190, 2.6], [128, 176, 2.1], [250, 12, 2]] });
await render("branch-small", { W: 900, seed: 14, anchorCount: 15, bokeh: [[36, 30, 2.2], [210, 150, 2.4]] });
