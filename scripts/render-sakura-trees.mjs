// Renders the cherry-blossom trees that stand on the hillside of the sign-in page.
//
//   node scripts/render-sakura-trees.mjs        (or: npm run sakura:trees)
//
// Each tree is drawn as layered vector artwork (a gnarled dark trunk and limbs, then several hundred five-petal blossoms
// in three depths: far ones softer and deeper in colour, near ones brighter and sharper, with a few young bronze leaves),
// then finished like a photograph: the underside of the crown is shaded and the top catches the light. The result is a
// transparent WebP in public/images/sakura/. Nothing is downloaded and nothing is paid for. The pictures are committed,
// so this only needs to run when the artwork changes. (`sharp` is already installed because Next.js uses it.)

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/images/sakura");
fs.mkdirSync(OUT, { recursive: true });

const W = 1000;
const H = 840;
const CROP = 690; // rows kept (the picture is 1000 x 690)
const f2 = (v) => Math.round(v * 100) / 100;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const PETAL = "M0 0 C -2.6 -1 -4.6 -4.6 -3.3 -7.1 C -2.6 -8.4 -1.1 -8.4 0 -7.2 C 1.1 -8.4 2.6 -8.4 3.3 -7.1 C 4.6 -4.6 2.6 -1 0 0 Z";

function blossomDefs() {
  const variant = (v) => {
    const petals = [0, 1, 2, 3, 4]
      .map((k) => {
        const jitter = (((k * 37 + v * 19) % 11) - 5) * 1.6;
        const sc = 0.94 + (((k * 13 + v * 7) % 7) / 7) * 0.14;
        return `<g transform="rotate(${k * 72 + (v === 2 ? 36 : 0) + jitter}) scale(${sc})">
          <use href="#p" fill="url(#petalfill)" stroke="#f0a0c0" stroke-width="0.18" opacity="0.97"/>
          <path d="M0 -0.8 L0 -5.6" stroke="#ee6f9c" stroke-width="0.2" opacity="0.4" fill="none"/>
        </g>`;
      })
      .join("");
    const count = 8;
    const stamens = Array.from({ length: count }, (_, k) => {
      const a = (k / count) * Math.PI * 2 + v;
      const len = 2.4 + (k % 3) * 0.5;
      const x = f2(Math.cos(a) * len);
      const y = f2(Math.sin(a) * len);
      return `<line x1="${f2(Math.cos(a) * 0.8)}" y1="${f2(Math.sin(a) * 0.8)}" x2="${x}" y2="${y}" stroke="#f2a0be" stroke-width="0.2"/><circle cx="${x}" cy="${y}" r="0.33" fill="${k % 4 === 0 ? "#d4574c" : "#e9b54a"}"/>`;
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
    <g id="leaf"><path d="M0 0 C -3.2 -2.6 -3 -7.6 0 -11.6 C 3 -7.6 3.2 -2.6 0 0 Z" fill="#9a5a40"/><path d="M0 -0.6 L0 -9.6" stroke="#cf9d78" stroke-width="0.3" opacity="0.7"/></g>`;
}

// Three depths x three shades. Depth: far blossoms are blurred and dimmer; near ones sharp. Shade: the underside of the crown is darker.
const DEPTH = [
  { blur: 2.6, bright: 0.86 },
  { blur: 1.1, bright: 0.96 },
  { blur: 0.35, bright: 1.04 },
];
const SHADE = [0.56, 0.98, 1.14];
const TINT = [[0.9, 0.74, 0.96], [1, 1, 1], [1.04, 1.01, 0.99]]; // the shaded side is cooler and more violet, the lit side a touch warmer
function filters() {
  let out = "";
  DEPTH.forEach((d, di) =>
    SHADE.forEach((s, si) => {
      const k = f2(d.bright * s);
      out += `<filter id="f${di}${si}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${d.blur}"/><feComponentTransfer><feFuncR type="linear" slope="${f2(k * TINT[si][0])}"/><feFuncG type="linear" slope="${f2(k * TINT[si][1])}"/><feFuncB type="linear" slope="${f2(k * TINT[si][2])}"/></feComponentTransfer></filter>`;
    }),
  );
  return out;
}

// A few lobes make the crown lumpy like a real tree's; limbs reach into them.
const TREES = {
  a: {
    seed: 7,
    trunk: { x: 500, top: 520, w: 46 },
    lobes: [[500, 300, 330, 230], [300, 400, 230, 160], [700, 400, 240, 165], [420, 200, 200, 150], [620, 220, 210, 150], [180, 480, 140, 95], [840, 470, 140, 95]],
    limbs: [
      ["M500 800 C 498 700 506 610 492 520 S 470 420 500 340", 40],
      ["M496 560 C 440 520 360 480 290 430 S 200 410 170 470", 17],
      ["M500 540 C 560 510 640 470 720 430 S 800 420 840 470", 17],
      ["M492 440 C 450 380 420 320 400 250", 12],
      ["M500 420 C 540 360 590 320 630 250", 12],
      ["M300 440 C 270 480 230 500 200 560", 8],
      ["M720 440 C 760 490 790 520 810 570", 8],
    ],
  },
  b: {
    seed: 21,
    trunk: { x: 470, top: 540, w: 40 },
    lobes: [[470, 320, 300, 220], [260, 420, 210, 150], [690, 380, 250, 180], [380, 210, 200, 140], [600, 210, 190, 130], [130, 500, 120, 85], [820, 480, 130, 90]],
    limbs: [
      ["M470 800 C 480 710 456 640 476 540 S 500 430 470 350", 36],
      ["M470 580 C 410 540 330 500 262 440 S 170 440 140 500", 15],
      ["M478 560 C 550 520 620 500 690 440 S 790 440 820 490", 16],
      ["M476 450 C 440 390 400 330 380 260", 11],
      ["M486 430 C 520 370 570 330 600 260", 11],
    ],
  },
  c: {
    seed: 43,
    trunk: { x: 520, top: 500, w: 42 },
    lobes: [[520, 290, 340, 215], [330, 380, 230, 150], [720, 360, 250, 170], [440, 190, 210, 140], [650, 190, 200, 130], [210, 460, 150, 100], [860, 450, 130, 90], [520, 430, 280, 120]],
    limbs: [
      ["M520 800 C 530 700 500 620 516 500 S 540 400 516 320", 38],
      ["M516 560 C 450 520 370 490 300 430 S 220 420 200 480", 16],
      ["M520 530 C 600 500 680 470 740 420 S 830 420 860 470", 16],
      ["M516 420 C 480 360 450 310 430 240", 11],
      ["M526 410 C 560 350 610 310 650 240", 11],
      ["M330 440 C 300 480 270 520 250 570", 7],
    ],
  },
};

function ellipsePoint(r, [cx, cy, rx, ry]) {
  const a = r() * Math.PI * 2;
  const d = Math.sqrt(r()) ;
  // Slightly favour the rim so the crown has a defined, lumpy edge.
  const rim = 0.55 + 0.45 * d;
  return [cx + Math.cos(a) * rx * rim, cy + Math.sin(a) * ry * rim];
}

function inCrown(x, y, lobes) {
  return lobes.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
}

function treeSvg(t) {
  const r = rng(t.seed);
  const limbs = t.limbs
    .map(([d, w]) => {
      return `<path d="${d}" stroke="#2a1b26" stroke-width="${w * 1.12}"/>
        <path d="${d}" stroke="#3b2631" stroke-width="${w * 0.8}"/>
        <path d="${d}" stroke="#6d4a58" stroke-width="${Math.max(1.2, w * 0.14)}" stroke-opacity="0.5" transform="translate(${-w * 0.2} ${-w * 0.1})"/>`;
    })
    .join("");
  // Root flare at the foot of the trunk.
  const foot = `<path d="M${t.trunk.x - 52} 812 C ${t.trunk.x - 20} 780 ${t.trunk.x - 16} 740 ${t.trunk.x - 18} 700 L ${t.trunk.x + 18} 700 C ${t.trunk.x + 16} 740 ${t.trunk.x + 20} 780 ${t.trunk.x + 58} 812 Z" fill="#3b2631"/>`;

  // Blossoms grow in clumps, as they do on a real tree, so the crown is mottled with larger patches of light and shade rather than
  // evenly dotted: pick clump centres inside the crown, give each a light value from where it sits, and scatter its blossoms
  // around it. A darker rose backing fills the gaps between clumps so the crown has depth.
  const groups = DEPTH.flatMap((_, di) => SHADE.map((_, si) => ({ di, si, items: [] })));
  const clumps = [];
  let guard = 0;
  while (clumps.length < 100 && guard++ < 4000) {
    const lobe = t.lobes[Math.floor(r() * t.lobes.length)];
    const [x, y] = ellipsePoint(r, lobe);
    if (!inCrown(x, y, t.lobes) || y > 690 || x < 40 || x > W - 40 || y < 40) continue;
    if (y > 520 && r() < 0.55) continue;
    clumps.push({ x, y, rad: 26 + r() * 40, lit: ((x - 520) / 520) * 0.3 - ((y - 300) / 520) * 0.7 + (r() - 0.5) * 0.7 });
  }
  clumps.forEach((c) => {
    const n = 8 + Math.floor(r() * 9);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * c.rad;
      const x = c.x + Math.cos(a) * d;
      const y = c.y + Math.sin(a) * d * 0.85;
      if (!inCrown(x, y, t.lobes) || x < 20 || x > W - 20 || y < 20 || y > 700) continue;
      const di = r() < 0.3 ? 0 : r() < 0.62 ? 1 : 2;
      const lit = c.lit + (r() - 0.5) * 0.18;
      const si = lit > 0.1 ? 2 : lit > -0.22 ? 1 : 0;
      const sc = (0.95 + r() * 0.8) * (di === 0 ? 1.1 : 1);
      groups[di * 3 + si].items.push(`<g transform="translate(${f2(x)} ${f2(y)}) rotate(${Math.round(r() * 360)}) scale(${f2(sc * 2.7)} ${f2(sc * 2.7 * (r() < 0.25 ? 0.62 : 1))})"><use href="#bl${r() < 0.5 ? 1 : 2}"/></g>`);
    }
  });
  const backing = t.lobes.map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.9}" ry="${ry * 0.88}"/>`).join("");
  // Young bronze leaves, a few, tucked among the blossoms.
  const leaves = Array.from({ length: 46 }, () => {
    const lobe = t.lobes[Math.floor(r() * t.lobes.length)];
    const [x, y] = ellipsePoint(r, lobe);
    return `<g transform="translate(${f2(x)} ${f2(y)}) rotate(${Math.round(r() * 360)}) scale(${f2(2 + r() * 1.4)})" opacity="0.85"><use href="#leaf"/></g>`;
  }).join("");

  const blossoms = groups
    .sort((a, b) => a.di - b.di)
    .map((g) => `<g filter="url(#f${g.di}${g.si})">${g.items.join("")}</g>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${blossomDefs()}${filters()}
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="bark" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="${t.seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/></filter>
  </defs>
  <g filter="url(#bark)" fill="none" stroke-linecap="round" stroke-linejoin="round">${limbs}</g>${foot}
  <g filter="url(#soft)" fill="#a06f93" opacity="0.92">${backing}</g>
  <g>${leaves}</g>
  ${blossoms}</svg>`;
}

async function render(name, t) {
  const svg = treeSvg(t);
  let img = await sharp(Buffer.from(svg), { density: 72 }).png().toBuffer();
  // Light on the top of the crown (from the upper right, where the dusk glow is) and cool shade underneath, only where the tree is.
  const light = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="l" x1="0.75" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#fff2e8" stop-opacity="0.2"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#2a2150" stop-opacity="0.34"/>
    </linearGradient></defs><rect width="${W}" height="${H}" fill="url(#l)"/></svg>`,
  );
  img = await sharp(img).composite([{ input: light, blend: "atop" }]).toBuffer();
  const file = path.join(OUT, `tree-${name}.webp`);
  // Only the foot of the trunk is kept (the tree stands in a grove, its trunk half hidden by the trees in front and the bank).
  await sharp(img).extract({ left: 0, top: 0, width: W, height: CROP }).modulate({ saturation: 0.92 }).webp({ quality: 78, alphaQuality: 85, effort: 6 }).toFile(file);
  console.log(name, `${W}x${H}`, `${Math.round(fs.statSync(file).size / 1024)} KB`);
}

for (const [name, t] of Object.entries(TREES)) await render(name, t);
