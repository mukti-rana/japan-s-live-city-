// Renders the cherry trees of the sign-in page.
//
//   node scripts/render-sakura-trees.mjs        (or: npm run sakura:trees)
//
// Each tree is GROWN, not stamped: a trunk forks into limbs, limbs into branches, branches into twigs, each a little crooked,
// arching up and then drooping the way a cherry tree's do, tapering as they go, with cherry bark (dark, reddish-grey, with the
// pale horizontal lenticels). Blossoms grow only on the thin wood, in small clusters of two to four on short stalks, each a
// five-petal flower with notched petals, veins, a pink heart and stamens, seen face on or tilted, with a few buds and young
// bronze leaves. Branches show between the flowers.
//
// Every picture is written as two transparent WebP layers, WOOD and BLOOM, so the page can sway them a little out of step
// (the flowers flutter on the wood). The big foreground branch also has a soft out-of-focus layer of blossoms, like a
// photograph taken from under the tree. Nothing is downloaded and nothing is paid for. The pictures are committed, so this
// only needs to run when the artwork changes. (`sharp` is already installed because Next.js uses it.)

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/images/sakura");
fs.mkdirSync(OUT, { recursive: true });

const f2 = (v) => Math.round(v * 100) / 100;
const rad = (d) => (d * Math.PI) / 180;
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ─── Flower artwork (unit size: a petal is about 9.6 long) ───────────────────────────────────────────────────────────────────
const PETAL = "M0 0 C -3.3 -1.2 -5.7 -5.1 -4.2 -8.1 C -3.4 -9.6 -1.7 -9.7 -0.55 -8.5 L 0 -7.9 L 0.55 -8.5 C 1.7 -9.7 3.4 -9.6 4.2 -8.1 C 5.7 -5.1 3.3 -1.2 0 0 Z";

function flowerDefs() {
  const flower = (id, fill, seed, stamens) => {
    const r = rng(seed);
    const petals = [0, 1, 2, 3, 4]
      .map((k) => {
        const rot = k * 72 + (r() - 0.5) * 14;
        const sc = 0.92 + r() * 0.18;
        return `<g transform="rotate(${f2(rot)}) scale(${f2(sc)})"><path d="${PETAL}" fill="url(#${fill})" stroke="#e79ab6" stroke-width="0.16" stroke-opacity="0.8"/><path d="M0 -1 L0 -6.4 M0 -2.4 L-1.5 -5 M0 -2.4 L1.5 -5" stroke="#e8749f" stroke-width="0.14" stroke-opacity="0.38" fill="none"/></g>`;
      })
      .join("");
    const st = Array.from({ length: stamens }, (_, k) => {
      const a = (k / stamens) * Math.PI * 2 + r();
      const len = 2.6 + r() * 1.7;
      const x = f2(Math.cos(a) * len);
      const y = f2(Math.sin(a) * len);
      return `<line x1="0" y1="0" x2="${x}" y2="${y}" stroke="#f0a6c0" stroke-width="0.17"/><circle cx="${x}" cy="${y}" r="0.34" fill="${k % 3 === 0 ? "#cf5a63" : "#f1d27a"}"/>`;
    }).join("");
    return `<g id="${id}">${petals}<circle r="1.15" fill="#e36a98" opacity="0.9"/><circle r="0.55" fill="#b43d72"/>${st}</g>`;
  };
  return `
    <radialGradient id="petalW" cx="0.5" cy="1" r="1.05"><stop offset="0" stop-color="#ec7aa4"/><stop offset="0.2" stop-color="#f8b4cd"/><stop offset="0.55" stop-color="#fde3ec"/><stop offset="1" stop-color="#fff7fa"/></radialGradient>
    <radialGradient id="petalP" cx="0.5" cy="1" r="1.05"><stop offset="0" stop-color="#e0588a"/><stop offset="0.25" stop-color="#f49bbd"/><stop offset="0.65" stop-color="#f9cddd"/><stop offset="1" stop-color="#fdeaf1"/></radialGradient>
    ${flower("fl1", "petalW", 11, 10)}${flower("fl2", "petalP", 23, 9)}${flower("fl3", "petalW", 37, 11)}${flower("fl4", "petalP", 51, 8)}
    <g id="bud"><path d="M0 0 C -2.2 -1.3 -2.4 -4.8 0 -7 C 2.4 -4.8 2.2 -1.3 0 0 Z" fill="#dd6f9a" stroke="#b9487a" stroke-width="0.25"/><path d="M0 -2.8 C -1.2 -3.9 -1.1 -5.6 0 -7 C 1.1 -5.6 1.2 -3.9 0 -2.8 Z" fill="#f5bfd5" opacity="0.8"/></g>
    <g id="leaf"><path d="M0 0 C -2.7 -2.2 -2.6 -6.6 0 -10 C 2.6 -6.6 2.7 -2.2 0 0 Z" fill="#8d4b3b"/><path d="M0 -0.5 L0 -8.4" stroke="#c99370" stroke-width="0.25" opacity="0.7"/></g>`;
}

// ─── Growing a tree ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// Angles are measured from the +x axis with y pointing down, so straight up is -90 degrees.
function grow(spec, seed) {
  const r = rng(seed);
  const segs = [];
  const clusters = [];
  const UP = -Math.PI / 2;

  function branch(x, y, ang, len, w, depth) {
    const steps = Math.max(3, Math.round(len / 13));
    const step = len / steps;
    const w0 = w;
    let cx = x;
    let cy = y;
    let a = ang;
    let forkIndex = 0;
    // Where this branch forks, along its length.
    const forks = new Set();
    const limb = depth === 0 && spec.limbForks; // a long limb reaching in from the side forks all along its length
    if (depth < spec.maxDepth && w > spec.minW) {
      const n = limb ? spec.limbForks : depth === 0 ? 1 : 2 + Math.floor(r() * 2);
      for (let k = 0; k < n; k++) forks.add(Math.max(1, Math.round(steps * (limb ? 0.12 + (k / n) * 0.8 + r() * 0.06 : depth === 0 ? 0.7 + r() * 0.28 : 0.25 + r() * 0.65))));
    }
    for (let i = 1; i <= steps; i++) {
      // Crooked growth; thick limbs reach up, then thin twigs arch outward and droop under their own weight.
      a += (r() - 0.5) * spec.crook;
      if (depth <= 1) a += (UP - a) * spec.reach;
      else if (depth >= 3) a += (Math.PI / 2 - a) * spec.droop * (1 - Math.abs(Math.sin(a)) * 0.4);
      const nx = cx + Math.cos(a) * step;
      const ny = cy + Math.sin(a) * step;
      const wa = w0 * (1 - ((i - 1) / steps) * 0.42);
      const wb = w0 * (1 - (i / steps) * 0.42);
      segs.push({ x1: cx, y1: cy, x2: nx, y2: ny, w1: wa, w2: wb, depth });
      cx = nx;
      cy = ny;
      if (forks.has(i)) {
        forkIndex++;
        const turns = limb ? [(forkIndex % 2 ? -1 : 1) * (0.55 + r() * 0.5)] : depth === 0 ? spec.trunkSpread : [(r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.5)];
        turns.forEach((turn) => branch(cx, cy, a + turn, len * (limb ? 0.3 + r() * 0.2 : 0.52 + r() * 0.26) * (depth === 0 && !limb ? spec.limbMul ?? 1.45 : 1), wb * (limb ? 0.5 : depth === 0 ? 0.62 : 0.6), depth + 1));
      }
      // Blossoms grow on thin wood only, a cluster here and there along it.
      if (wb < spec.flowerW && depth >= spec.flowerDepth && r() < spec.density) clusters.push({ x: cx, y: cy, a, w: wb, s: 0.8 + r() * 0.5 });
    }
    if (depth >= spec.flowerDepth && w0 < spec.flowerW * 1.3) clusters.push({ x: cx, y: cy, a, w: w0 * 0.5, s: 1, tip: true });
  }
  spec.starts.forEach((s) => branch(s.x, s.y, rad(s.ang), s.len, s.w, s.depth ?? 0));
  return { segs, clusters, stalks: [] };
}

function woodSvg(W, H, g, seed, spec) {
  const r = rng(seed + 5);
  const sorted = [...g.segs].sort((a, b) => a.depth - b.depth);
  const pal = spec.bark ?? ["#33252a", "#3d2c32", "#4a353b", "#573e44"];
  const col = (d) => pal[Math.min(d, 3) <= 1 ? 0 : Math.min(d, 3)];
  const minW = spec.minStroke ?? 0;
  const avg = (s) => (s.w1 + s.w2) / 2;
  const body = sorted.map((s) => `<line x1="${f2(s.x1)}" y1="${f2(s.y1)}" x2="${f2(s.x2)}" y2="${f2(s.y2)}" stroke="${col(s.depth)}" stroke-width="${f2(Math.max(minW, avg(s)))}"/>`).join("");
  // The lit side: a thin pale line along each thick segment, nudged to the upper left.
  const lit = sorted
    .filter((s) => avg(s) > 3)
    .map((s) => {
      const o = avg(s) * 0.22;
      return `<line x1="${f2(s.x1 - o)}" y1="${f2(s.y1 - o)}" x2="${f2(s.x2 - o)}" y2="${f2(s.y2 - o)}" stroke="#8b6b74" stroke-width="${f2(Math.max(0.8, avg(s) * 0.15))}" stroke-opacity="0.5"/>`;
    })
    .join("");
  // Lenticels: short pale dashes across the bark, perpendicular to the branch.
  const lent = sorted
    .filter((s) => avg(s) > 6 && r() < 0.5)
    .map((s) => {
      const w = avg(s);
      const ang = (Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI + 90;
      const t = r();
      const len = w * (0.25 + r() * 0.3);
      return `<line x1="${f2(-len)}" y1="0" x2="${f2(len)}" y2="0" transform="translate(${f2(s.x1 + (s.x2 - s.x1) * t)} ${f2(s.y1 + (s.y2 - s.y1) * t)}) rotate(${f2(ang)})" stroke="#a58f95" stroke-width="${f2(Math.max(0.7, w * 0.05))}" stroke-opacity="0.55" stroke-linecap="round"/>`;
    })
    .join("");
  const stalks = g.stalks.map((s) => `<line x1="${f2(s.x1)}" y1="${f2(s.y1)}" x2="${f2(s.x2)}" y2="${f2(s.y2)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>
    <filter id="rough" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter>
  </defs>
  <g filter="url(#rough)" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}${lit}${lent}</g>
  <g stroke="#7e4f5b" stroke-width="1.1" stroke-linecap="round" opacity="0.9">${stalks}</g></svg>`;
}

// Blossoms: clusters on stalks (the stalks are added to g so the wood layer draws them).
function bloom(g, seed, fs) {
  const r = rng(seed + 9);
  const flowers = [];
  const buds = [];
  const leaves = [];
  g.clusters.forEach((c) => {
    const n = c.tip ? 2 + Math.floor(r() * 2) : 2 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const dir = c.a + (r() - 0.5) * 2.2;
      const sl = (5 + r() * 12) * fs * 0.6;
      const x = c.x + Math.cos(dir) * sl + (r() - 0.5) * 4 * fs * 0.6;
      const y = c.y + Math.sin(dir) * sl + (r() - 0.5) * 4 * fs * 0.6 + sl * 0.18; // the weight of the flower hangs it a little
      g.stalks.push({ x1: c.x, y1: c.y, x2: x, y2: y });
      const face = r();
      flowers.push({ x, y, size: fs * c.s * (0.8 + r() * 0.5), rot: Math.round(r() * 360), tilt: face < 0.55 ? 1 : face < 0.85 ? 0.62 : 0.4, v: 1 + Math.floor(r() * 4), depth: r() });
    }
    if (r() < 0.4) buds.push({ x: c.x + (r() - 0.5) * 16 * fs * 0.5, y: c.y + (r() - 0.5) * 12 * fs * 0.5, rot: Math.round(r() * 360), s: fs * 0.55 });
    if (r() < 0.22) leaves.push({ x: c.x + Math.cos(c.a) * 6, y: c.y + Math.sin(c.a) * 6, rot: Math.round(c.a * 57.3 + 90 + (r() - 0.5) * 80), s: fs * 0.5 });
  });
  return { flowers, buds, leaves };
}

const place = (f) => `<g transform="translate(${f2(f.x)} ${f2(f.y)}) rotate(${f.rot}) scale(${f2(f.size)} ${f2(f.size * f.tilt)})"><use href="#fl${f.v}"/></g>`;

function bloomSvg(W, H, b) {
  const buds = b.buds.map((d) => `<g transform="translate(${f2(d.x)} ${f2(d.y)}) rotate(${d.rot}) scale(${f2(d.s)})"><use href="#bud"/></g>`).join("");
  const leaves = b.leaves.map((d) => `<g transform="translate(${f2(d.x)} ${f2(d.y)}) rotate(${d.rot}) scale(${f2(d.s)})"><use href="#leaf"/></g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${flowerDefs()}</defs>
    <g opacity="0.92">${leaves}</g>${buds}${b.flowers.map(place).join("")}</svg>`;
}

function bokehSvg(W, H, spots) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${flowerDefs()}</defs>${spots
    .map(([x, y, s, rot, v]) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><use href="#fl${v}"/></g>`)
    .join("")}</svg>`;
}

async function write(name, buf, q = 78) {
  const file = path.join(OUT, `${name}.webp`);
  await sharp(buf).webp({ quality: q, alphaQuality: 82, effort: 6 }).toFile(file);
  console.log(name, `${Math.round(fs.statSync(file).size / 1024)} KB`);
}

async function render(name, { W, H, seed, spec, fs: fl, bokeh, crop }) {
  const g = grow(spec, seed);
  const b = bloom(g, seed, fl);
  const png = (svg) => sharp(Buffer.from(svg), { density: 72 }).png().toBuffer();
  let wood = await png(woodSvg(W, H, g, seed, spec));
  let blossoms = await png(bloomSvg(W, H, b));
  if (bokeh) {
    // A few big blossoms close to the lens, soft and bright, as in a photograph.
    const soft = await sharp(await png(bokehSvg(W, H, bokeh))).blur(7).toBuffer();
    blossoms = await sharp(blossoms).composite([{ input: soft, blend: "over" }]).toBuffer();
  }
  // The light comes from the upper right, where the dusk glow is: a touch of warmth on top, cool shade underneath, only where the tree is.
  const light = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="l" x1="0.8" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#fff0e6" stop-opacity="0.18"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#2a2150" stop-opacity="0.3"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#l)"/></svg>`);
  wood = await sharp(wood).composite([{ input: light, blend: "atop" }]).toBuffer();
  blossoms = await sharp(blossoms).composite([{ input: light, blend: "atop" }]).toBuffer();
  const cut = (buf) => (crop ? sharp(buf).extract({ left: 0, top: 0, width: crop.w, height: crop.h }).toBuffer() : buf);
  await write(`${name}-wood`, await sharp(await cut(wood)).modulate({ saturation: 0.92 }).toBuffer());
  await write(`${name}-bloom`, await sharp(await cut(blossoms)).modulate({ saturation: 0.95 }).toBuffer());
}

// ─── The pictures ────────────────────────────────────────────────────────────────────────────────────────────────────────────

// The big branch that reaches in from the left edge in the foreground (1400 x 880; its root is off the left edge).
await render("sakura-hero", {
  W: 1400,
  H: 880,
  seed: 5,
  fs: 3.9,
  spec: {
    starts: [{ x: -40, y: 210, ang: 6, len: 1000, w: 34, depth: 0 }],
    limbForks: 5,
    maxDepth: 6,
    minW: 2,
    crook: 0.22,
    reach: 0,
    droop: 0.028,
    flowerW: 5,
    flowerDepth: 3,
    density: 0.1,
  },
  bokeh: [[1210, 250, 6.5, 120, 3], [1000, 700, 5.5, 40, 4], [90, 700, 6, 300, 1]],
});

// Trees on the hillside: a trunk, a spreading crown, blossoms on the outer wood so the branches show.
const hill = (seed, over = {}) => ({
  W: 900,
  H: 760,
  seed,
  fs: 1.45,
  crop: { w: 900, h: 700 },
  spec: {
    starts: [{ x: 450, y: 760, ang: -90 + ((seed % 3) - 1) * 5, len: 150, w: 44, depth: 0 }],
    bark: ["#5a4149", "#654a52", "#735762", "#80626c"],
    minStroke: 4.4,
    limbMul: 2.6,
    maxDepth: 6,
    minW: 1.6,
    trunkSpread: [0.9, -0.95, 0.3, -0.3],
    crook: 0.3,
    reach: 0.02,
    droop: 0.026,
    flowerW: 5,
    flowerDepth: 2,
    density: 0.25,
    ...over,
  },
});
await render("sakura-tree-a", hill(7));
await render("sakura-tree-b", hill(21, { trunkSpread: [1.0, -0.7, 0.2, -0.25] }));
await render("sakura-tree-c", hill(43, { trunkSpread: [0.75, -1.05, 0.35, -0.15] }));
