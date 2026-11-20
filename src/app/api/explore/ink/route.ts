import sharp from "sharp";
import { getDestination } from "@/lib/explore/catalogue";

export const runtime = "nodejs";

// The colours for the words laid over a place's photograph on the Explore page. They are worked out from the picture itself, not chosen at random:
//   1. the picture is shrunk and its colours counted (how much of each hue, weighted by how vivid it is);
//   2. the part of the screen the words will sit on (top right on a wide screen, top left on a phone) is measured, as it will really look under the
//      page's own shade: its average hue and how bright its brightest parts are;
//   3. the accent hue is one the photograph really contains (at least a sixteenth of its colour) that stands furthest from the hue behind the words, so
//      the words are of the picture but not lost in it (a blue sky gives the warm tone of the autumn leaves, a grey roof the blue of the sky);
//   4. each line is a light tint of that hue, made lighter until it reads against the picture at WCAG contrast 4.5 or more, and if the brightest parts
//      of the picture still defeat it, a soft dark glow behind the words is deepened just enough.
// It returns the colours and how deep the glow must be, for a wide and for a narrow screen. Nothing here is the visitor's data: it depends only on
// the place, so it is cached for a day.

type RGB = [number, number, number];
interface Ink {
  hue: number;
  glow: number;
  eyebrow: string;
  name: string;
  meta: string;
  credit: string;
}

const SHADE: RGB = [4, 5, 10];
const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

function hsv([r, g, b]: RGB): [number, number, number] {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx === 0 ? 0 : d / mx, mx / 255];
}

function hsl2rgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

// The page's shade over the photograph (see ExploreBackdrop): deep at the top and the foot, light in the middle, and deeper on the left.
function shadeAt(fx: number, fy: number): number {
  const ay = fy < 0.35 ? 0.55 - (0.3 * fy) / 0.35 : fy < 0.8 ? 0.25 + (0.45 * (fy - 0.35)) / 0.45 : 0.7 + (0.15 * (fy - 0.8)) / 0.2;
  const ax = fx < 0.62 ? 0.7 - (0.58 * fx) / 0.62 : 0.12 * (1 - (fx - 0.62) / 0.38);
  return 1 - (1 - ay) * (1 - ax);
}

interface Layout {
  aspect: number; // screen width / height
  box: [number, number, number, number]; // where the words sit, as fractions of the screen: x0, y0, x1, y1
}
const WIDE: Layout = { aspect: 1.6, box: [0.62, 0.1, 0.96, 0.4] };
const NARROW: Layout = { aspect: 0.46, box: [0.04, 0.1, 0.72, 0.34] };

function inkFor(px: Buffer, w: number, h: number, accentWeights: number[], layout: Layout): Ink {
  // The picture fills the screen (object-fit: cover), centred: map screen fractions onto the picture.
  const a = w / h;
  const vx = Math.min(1, layout.aspect / a); // the share of the width that shows
  const vy = Math.min(1, a / layout.aspect); // the share of the height that shows
  const toImg = (fx: number, fy: number) => [0.5 - vx / 2 + fx * vx, 0.5 - vy / 2 + fy * vy] as const;

  const [bx0, by0, bx1, by1] = layout.box;
  const lums: number[] = [];
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  const STEPS = 18;
  for (let i = 0; i < STEPS; i++) {
    for (let j = 0; j < STEPS; j++) {
      const fx = bx0 + ((bx1 - bx0) * (i + 0.5)) / STEPS;
      const fy = by0 + ((by1 - by0) * (j + 0.5)) / STEPS;
      const [ix, iy] = toImg(fx, fy);
      const x = Math.min(w - 1, Math.max(0, Math.floor(ix * w)));
      const y = Math.min(h - 1, Math.max(0, Math.floor(iy * h)));
      const o = (y * w + x) * 3;
      const al = shadeAt(fx, fy);
      const c: RGB = [px[o] * (1 - al) + SHADE[0] * al, px[o + 1] * (1 - al) + SHADE[1] * al, px[o + 2] * (1 - al) + SHADE[2] * al];
      lums.push(lum(c));
      sr += c[0];
      sg += c[1];
      sb += c[2];
      n++;
    }
  }
  lums.sort((p, q) => p - q);
  const bright = lums[Math.floor(lums.length * 0.9)]; // the brightest tenth is what the words must still read against
  const [regionHue, regionSat] = hsv([sr / n, sg / n, sb / n]);

  // The accent hue: one the picture really has, furthest from the hue behind the words.
  const total = accentWeights.reduce((p, q) => p + q, 0);
  let hue = 38; // no vivid colour at all (a grey or snowy picture): a warm paper white
  let vivid = total > 0.5;
  if (vivid) {
    const BINS = accentWeights.length;
    let best = -1;
    let bestScore = -1;
    for (let b = 0; b < BINS; b++) {
      if (accentWeights[b] < total * 0.06) continue;
      const centre = (b + 0.5) * (360 / BINS);
      const score = regionSat > 0.06 ? hueGap(centre, regionHue) + accentWeights[b] / total : accentWeights[b];
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (best < 0) vivid = false;
    else hue = (best + 0.5) * (360 / BINS);
  }

  // Each line: a rich tint of the hue. First the glow behind the words is deepened (up to a soft limit) until the colour reads as it is; only if that is
  // not enough is the colour itself made lighter.
  const lines: [keyof Pick<Ink, "eyebrow" | "name" | "meta" | "credit">, number, number][] = [
    ["name", vivid ? 0.9 : 0.3, vivid ? 0.78 : 0.88],
    ["eyebrow", vivid ? 0.8 : 0.25, vivid ? 0.74 : 0.82],
    ["meta", vivid ? 0.55 : 0.2, vivid ? 0.88 : 0.92],
    ["credit", vivid ? 0.45 : 0.15, vivid ? 0.84 : 0.86],
  ];
  const attempt = (glow: number, lighten: boolean) => {
    const bg = bright * (1 - glow) ** 2.2; // a black glow of this depth, in light terms
    const out: Partial<Ink> = {};
    let ok = true;
    for (const [key, sat, base] of lines) {
      let l = base;
      let c = hsl2rgb(hue, sat, l);
      while (lighten && contrast(lum(c), bg) < 4.5 && l < 0.975) {
        l += 0.01;
        c = hsl2rgb(hue, sat, l);
      }
      if (contrast(lum(c), bg) < 4.5) ok = false;
      out[key] = hex(c);
    }
    return { ok, ink: { hue: Math.round(hue), glow: Math.round(glow * 100) / 100, ...(out as Omit<Ink, "hue" | "glow">) } as Ink };
  };
  for (let glow = 0; glow <= 0.45 + 1e-9; glow += 0.05) {
    const r = attempt(glow, false);
    if (r.ok) return r.ink;
  }
  return attempt(0.45, true).ink;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^Q\d{1,12}$/.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const image = getDestination(id)?.image;
  // Only the catalogue's own Wikimedia picture of the place is ever fetched, never an address from the request.
  if (!image || !/(^|\.)wikimedia\.org$/.test(new URL(image.thumb).hostname)) return Response.json({ error: "no photograph" }, { status: 404 });
  try {
    const res = await fetch(image.thumb, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000), headers: { "User-Agent": "LiveCityJapan/1.0 (educational project; caption colours)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize({ width: 96, withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const BINS = 24;
    const weights = new Array<number>(BINS).fill(0);
    for (let i = 0; i < data.length; i += 3) {
      const [h, s, v] = hsv([data[i], data[i + 1], data[i + 2]]);
      if (s < 0.25 || v < 0.2) continue;
      weights[Math.min(BINS - 1, Math.floor(h / (360 / BINS)))] += s * v;
    }
    const wide = inkFor(data, info.width, info.height, weights, WIDE);
    const narrow = inkFor(data, info.width, info.height, weights, NARROW);
    return Response.json({ wide, narrow }, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
}
