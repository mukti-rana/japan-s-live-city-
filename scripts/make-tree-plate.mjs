// Makes the "sky plate" for the sign-in picture's cherry tree: a copy of the picture with the tree taken out and the sky behind it
// filled in smoothly, and a mask saying which pixels are tree.
//
//   node scripts/make-tree-plate.mjs        (or: npm run login:plate)
//
// The picture is one flat image, so to make only the branches and blossom move (and never the sky behind them) the shader needs two
// things: the tree on its own (the picture itself, wherever the mask says "tree") and the sky behind it (this plate). The tree is
// deformed by the wind simulation and drawn over the still plate. The mask separates tree from sky by what a tree looks like next to a
// smooth dusk sky: it is dark, or it is finely detailed, or it is the saturated magenta of the blossom; the sky behind is then
// filled from the sky around it, repeatedly blurring the known sky into the gaps at wider and wider scales (a smooth sunset needs
// nothing cleverer). Output: fuji-sakura-dusk-plate.webp (the sky plate) and fuji-sakura-dusk-tree.webp (the tree mask, white = tree),
// both opaque, because browsers throw away the colour of fully transparent pixels and the plate needs the sky's colour everywhere.
// (`sharp` is already installed because Next.js uses it.)

import sharp from "sharp";
import path from "node:path";

const SRC = path.resolve("public/images/login/fuji-sakura-dusk.webp");
const OUT = path.resolve("public/images/login/fuji-sakura-dusk-plate.webp");
const OUT_MASK = path.resolve("public/images/login/fuji-sakura-dusk-tree.webp");
const DEBUG = process.argv.includes("--debug");

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;

const rgb = new Float32Array(N * 3);
for (let i = 0; i < N * 3; i++) rgb[i] = data[i] / 255;
const Y = new Float32Array(N);
const SAT = new Float32Array(N);
const HUE = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
  Y[i] = 0.3 * r + 0.59 * g + 0.11 * b;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  SAT[i] = mx === 0 ? 0 : d / mx;
  let h = 0;
  if (d > 1e-6) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  HUE[i] = h;
}

// Box blur (separable, repeated a few times ~ a gaussian) on a single-channel float image.
function blur(src, r, passes = 3) {
  let a = Float32Array.from(src);
  let b = new Float32Array(N);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) {
      let acc = 0;
      const row = y * W;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        b[row + x] = acc / (2 * r + 1);
        acc += a[row + Math.min(W - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = acc / (2 * r + 1);
        acc += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x];
      }
    }
  }
  return a;
}
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Local detail: standard deviation of luminance in a small neighbourhood.
const m1 = blur(Y, 3, 2);
const Y2 = new Float32Array(N);
for (let i = 0; i < N; i++) Y2[i] = Y[i] * Y[i];
const m2 = blur(Y2, 3, 2);
const detail = new Float32Array(N);
for (let i = 0; i < N; i++) detail[i] = Math.sqrt(Math.max(0, m2[i] - m1[i] * m1[i]));

// Where the trees are: two outlines drawn round them with some margin (the blossom canopy at the top left, and the grove along the
// shore). Everything outside them is sky, mountain or water and is never touched. The outlines are softened so the edge has no seam.
const OUTLINES = [
  [[0, 0], [830, 0], [830, 125], [690, 150], [665, 215], [675, 325], [520, 335], [430, 305], [380, 292], [345, 326], [330, 380], [250, 395], [160, 395], [0, 430]],
  [[0, 330], [150, 360], [250, 372], [262, 404], [330, 400], [420, 425], [470, 462], [525, 490], [625, 512], [705, 556], [725, 612], [0, 640]],
];
const zoneMask = new Float32Array(N);
for (const poly of OUTLINES) {
  for (let y = 0; y < H; y++) {
    const xs = [];
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(W - 1, Math.floor(xs[k + 1])); x++) zoneMask[y * W + x] = 1;
  }
}
const zoneSoft = blur(zoneMask, 6, 2);

// Tree score 0..1, only inside those outlines.
let tree = new Float32Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const zone = zoneSoft[i];
    if (zone < 0.01) continue;
    const blueish = smooth(1.05, 1.4, rgb[i * 3 + 2] / Math.max(rgb[i * 3], 0.02)); // the dark blue of the evening sky is not wood
    const dark = smooth(0.46, 0.3, Y[i]) * (1 - blueish * smooth(0.08, 0.14, Y[i]));        // branches and shaded blossom
    const fine = smooth(0.035, 0.075, detail[i]);                // twigs, petals, edges
    const hue = HUE[i];
    const magenta = (hue >= 295 || hue <= 9 ? 1 : 0) * smooth(0.42, 0.62, SAT[i]) * smooth(0.55, 0.4, Y[i]);
    tree[i] = Math.max(dark, fine, magenta) * zone;
  }
}
// Close small gaps inside blossom (so petals are solid), then a little growth so the edge fringe goes with the tree.
tree = blur(tree, 2, 2);
for (let i = 0; i < N; i++) tree[i] = smooth(0.12, 0.42, tree[i]);

// The sky behind: fill the gaps from the known sky, at wider and wider scales. Each pass blurs what is known so far (the real sky plus
// what earlier passes filled in) into the neighbouring gap; the passes run until even the middle of the canopy is filled.
const known = new Float32Array(N);
for (let i = 0; i < N; i++) known[i] = 1 - smooth(0.04, 0.2, tree[i]);
const plate = new Float32Array(N * 3);
for (let i = 0; i < N; i++) if (known[i] > 0) for (let c = 0; c < 3; c++) plate[i * 3 + c] = rgb[i * 3 + c];
const have = Float32Array.from(known); // how much of each pixel is filled so far (0..1)
for (const r of [5, 9, 16, 28, 48, 80, 130, 210, 340]) {
  const w = blur(have, r, 2);
  const chans = [0, 1, 2].map((c) => {
    const premult = new Float32Array(N);
    for (let i = 0; i < N; i++) premult[i] = plate[i * 3 + c] * have[i];
    return blur(premult, r, 2);
  });
  for (let i = 0; i < N; i++) {
    if (have[i] >= 0.999) continue;
    const wi = w[i];
    if (wi < 0.01) continue;
    const take = (1 - have[i]) * Math.min(1, wi * 2.5);
    for (let c = 0; c < 3; c++) plate[i * 3 + c] = (plate[i * 3 + c] * have[i] + (chans[c][i] / wi) * take) / (have[i] + take);
    have[i] += take;
  }
}
// Where the sky was already known (no tree) the plate is the picture itself.
const out = Buffer.alloc(N * 3);
const maskOut = Buffer.alloc(N * 3);
for (let i = 0; i < N; i++) {
  const k = known[i];
  for (let c = 0; c < 3; c++) {
    out[i * 3 + c] = Math.round(255 * Math.min(1, Math.max(0, rgb[i * 3 + c] * k + plate[i * 3 + c] * (1 - k))));
    maskOut[i * 3 + c] = Math.round(255 * Math.min(1, Math.max(0, tree[i])));
  }
}
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90, effort: 5 }).toFile(OUT);
await sharp(maskOut, { raw: { width: W, height: H, channels: 3 } }).webp({ lossless: true, effort: 5 }).toFile(OUT_MASK);
console.log("plate and mask written");
if (DEBUG) {
  const m = Buffer.alloc(N * 3);
  for (let i = 0; i < N; i++) {
    const t = tree[i];
    m[i * 3] = Math.round(255 * (rgb[i * 3] * (1 - t) * 0.5 + t));
    m[i * 3 + 1] = Math.round(255 * (rgb[i * 3 + 1] * (1 - t) * 0.5 + t));
    m[i * 3 + 2] = Math.round(255 * (rgb[i * 3 + 2] * (1 - t) * 0.5 + t));
  }
  await sharp(m, { raw: { width: W, height: H, channels: 3 } }).extract({ left: 0, top: 0, width: 900, height: 700 }).png().toFile("/private/tmp/claude-501/-Users-aayushranamagar-aayush-live-city-japan/b7020643-87a4-4f3d-bf56-a40916cf3504/scratchpad/plate-mask.png");
  const pl = Buffer.alloc(N * 3);
  for (let i = 0; i < N * 3; i++) pl[i] = out[i];
  await sharp(pl, { raw: { width: W, height: H, channels: 3 } }).extract({ left: 0, top: 0, width: 900, height: 700 }).png().toFile("/private/tmp/claude-501/-Users-aayushranamagar-aayush-live-city-japan/b7020643-87a4-4f3d-bf56-a40916cf3504/scratchpad/plate-sky.png");
}
