"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type { WeatherIconKind } from "@/lib/services/weather";

// The weather card's sky: a small live scene of what it is really like outside, drawn on a canvas.
//
//  - The SKY's colour follows the real time of day in Japan and the real sunrise and sunset: deep night, the first light before sunrise,
//    day, the golden hour, sunset and dusk, blending smoothly from one to the next. Overcast, rain and storms drain its colour and darken it.
//  - The SUN crosses the sky along an arc from sunrise to sunset, and at night the MOON crosses it, shown in its real phase (worked out
//    from the date). Cloud dims them.
//  - CLOUDS drift across in three layers; how many and how dense follows the condition, and how fast follows the real wind speed.
//    They are lit warm toward the sun at sunrise and sunset.
//  - RAIN falls at the real rate (the expected millimetres this hour), slanted by the wind, with splashes where it lands; drizzle is fine
//    and sparse, a downpour is heavy. SNOW drifts down and sways. A THUNDERSTORM flashes with lightning. FOG lies in slow bands.
//  - STARS twinkle on a clear night, with a shooting star now and then. A city skyline along the bottom lights its windows after dark.
// What makes it read as a real sky rather than a drawing:
//  - The MOON is a textured disc (seas and craters, made from noise), lit by the real phase with a soft terminator and a faint earthshine on the dark side,
//    tilted so its bright side faces where the sun really is. It rises and sets on a real moon's timetable (a new moon crosses with the sun, a full moon
//    at midnight), so it can hang pale in the daytime sky too. Moonlight brightens the sky and the clouds near it, and washes out the faint stars near it.
//  - STARS follow a real brightness spread (a few bright, most faint) in true star colours, scintillate, thin out and dim toward the hazy horizon (as in a city
//    sky), and the whole field turns slowly with the real time.
//  - The CITY glows: an orange light dome over the skyline at night (which clouds reflect), windows with a soft glow, and red beacons blinking on the antennas.
//  - Thin high CIRRUS drifts even in clear weather; by day the sun has a bloom and faint rays and the horizon a pale haze.
// Nothing here is a guess: the condition, wind, rain and the times are the real readings on the card. Under reduced motion it draws one
// still frame. It only runs while it is on screen and the tab is visible. Decoration only (aria-hidden).

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
type Sky = { top: RGB; mid: RGB; bot: RGB };
const S = (top: string, mid: string, bot: string): Sky => ({ top: hex(top), mid: hex(mid), bot: hex(bot) });

const NIGHT = S("#050918", "#0a1130", "#141d48");
const DAWN1 = S("#10173f", "#38306a", "#d4876c");
const DAWN2 = S("#1d3f7c", "#5a82bd", "#f1b98c");
const DAY = S("#1b57a6", "#3c80cb", "#82b5e4");
const GOLD = S("#22448a", "#76699d", "#ee9f68");
const SUNSET = S("#1b2966", "#874d85", "#f48e5c");
const DUSK = S("#0f1948", "#382e70", "#aa5679");

const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mixSky = (a: Sky, b: Sky, t: number): Sky => ({ top: mixc(a.top, b.top, t), mid: mixc(a.mid, b.mid, t), bot: mixc(a.bot, b.bot, t) });
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// How much of the sky is covered, and how dark, for each condition.
const COVER: Record<WeatherIconKind, number> = { clear: 0, partly: 0.4, cloud: 0.8, fog: 0.75, drizzle: 0.8, rain: 0.92, snow: 0.8, storm: 1 };

function jstMinutes(now: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(now);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (g("hour") % 24) * 60 + g("minute") + g("second") / 60;
}
const hm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// The sky's colours at a time of day, between the keyframes around the real sunrise and sunset.
function skyAt(tm: number, sr: number, ss: number): { sky: Sky; night: boolean } {
  const keys: [number, Sky][] = [
    [sr - 60, NIGHT],
    [sr - 20, DAWN1],
    [sr + 40, DAWN2],
    [sr + 130, DAY],
    [ss - 130, DAY],
    [ss - 50, GOLD],
    [ss, SUNSET],
    [ss + 50, DUSK],
    [ss + 100, NIGHT],
  ];
  if (tm <= keys[0][0] || tm >= keys[keys.length - 1][0]) return { sky: NIGHT, night: tm < sr || tm > ss };
  for (let i = 1; i < keys.length; i++) {
    if (tm <= keys[i][0]) {
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      const t = (tm - t0) / (t1 - t0);
      return { sky: mixSky(a, b, t * t * (3 - 2 * t)), night: tm < sr || tm > ss };
    }
  }
  return { sky: DAY, night: false };
}

// The moon's phase (0 new, 0.5 full) for a date, from the mean synodic month.
function moonPhase(now: number): number {
  const days = now / 86_400_000 + 2440587.5 - 2451550.1;
  const p = (days / 29.530588853) % 1;
  return p < 0 ? p + 1 : p;
}

// Smooth value noise, for the moon's surface.
function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(x: number, y: number): number {
  let v = 0;
  let a = 0.5;
  for (let i = 0; i < 4; i++) {
    v += a * vnoise(x, y);
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return v / 0.9375;
}
const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// The moon as a picture, made once per phase: a sphere lit from the side the phase says, with seas (the dark plains), craters with bright rims and one
// bright ray crater near the south, a soft terminator (the surface scatters light, so it is not a hard edge), and a faint blue earthshine on the dark part.
// The lit side is drawn on the right; the caller turns the picture so that side faces the sun.
const moonCache = new Map<number, HTMLCanvasElement>();
function moonSprite(phase: number): HTMLCanvasElement {
  const key = Math.round(phase * 120) % 120;
  const hit = moonCache.get(key);
  if (hit) return hit;
  const S = 192;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const c = cv.getContext("2d");
  if (!c) return cv;
  const img = c.createImageData(S, S);
  const ang = (key / 120) * Math.PI * 2;
  const Lx = Math.sin(ang);
  const Lz = -Math.cos(ang);
  const q = rng(99);
  const craters = Array.from({ length: 38 }, () => ({ u: (q() * 2 - 1) * 0.86, v: (q() * 2 - 1) * 0.86, r: 0.022 + Math.pow(q(), 2.2) * 0.11 }));
  craters.push({ u: -0.08, v: 0.74, r: 0.055 }); // the bright ray crater
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = ((x + 0.5) / S) * 2 - 1;
      const v = ((y + 0.5) / S) * 2 - 1;
      const r2 = u * u + v * v;
      const rad = Math.sqrt(r2);
      if (rad > 1.02) continue;
      const nz = Math.sqrt(Math.max(0, 1 - r2));
      // the surface
      let alb = 0.86 + (fbm(u * 7 + 11, v * 7 + 5) - 0.5) * 0.16;
      const mask = Math.min(1, Math.max(0, 1.15 - Math.hypot(u + 0.22, v + 0.12) * 1.15));
      const mare = sstep(0.46, 0.62, fbm(u * 2.2 + 4.3, v * 2.2 + 1.7) + (mask - 0.5) * 0.55);
      alb -= mare * 0.36;
      for (const k of craters) {
        const d = Math.hypot(u - k.u, v - k.v) / k.r;
        if (d < 1.25) alb += d < 0.9 ? -0.06 * (1 - d * d) : 0.1 * (1 - Math.abs(d - 1.02) / 0.25);
      }
      const tych = Math.hypot(u + 0.08, v - 0.74);
      alb += 0.3 * Math.exp(-tych * 9) + 0.07 * Math.exp(-tych * 3.2);
      // the light
      const d = Lx * u + Lz * nz;
      let lit = 0;
      if (d > 0) lit = Math.pow(Math.min(1, (2 * d) / (d + nz + 1e-4)), 0.85) * sstep(0, 0.07, d);
      const val = alb * lit;
      const earth = 0.07 * (1 - lit) * (0.55 + 0.45 * nz);
      const o = (y * S + x) * 4;
      img.data[o] = Math.min(255, 242 * val + 36 * earth * 6);
      img.data[o + 1] = Math.min(255, 237 * val + 46 * earth * 6);
      img.data[o + 2] = Math.min(255, 224 * val + 78 * earth * 6);
      img.data[o + 3] = Math.min(255, Math.max(0, (1 - rad) * S * 0.5 + 0.5) * 255);
    }
  }
  c.putImageData(img, 0, 0);
  moonCache.set(key, cv);
  return cv;
}

function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, phase: number, alpha: number, toSun: number, halo: boolean) {
  const illum = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (halo) {
    // moonlight in the air round it: wider and brighter the fuller the moon
    const R = r * (4 + illum * 6);
    const glow = ctx.createRadialGradient(x, y, r * 0.7, x, y, R);
    glow.addColorStop(0, `rgba(175,190,255,${0.12 + 0.3 * illum})`);
    glow.addColorStop(0.35, `rgba(150,170,245,${0.05 + 0.1 * illum})`);
    glow.addColorStop(1, "rgba(150,170,245,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
  }
  ctx.translate(x, y);
  ctx.rotate(toSun);
  ctx.drawImage(moonSprite(phase), -r, -r, r * 2, r * 2);
  ctx.restore();
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Cloud = { x: number; y: number; w: number; layer: number; v: number; a: number; s: number };
type Drop = { x: number; y: number; v: number; len: number; a: number };
type Flake = { x: number; y: number; r: number; v: number; ph: number; a: number };
type Splash = { x: number; y: number; t: number };
type Star = { rho: number; th: number; r: number; b: number; p: number; f: number; c: number };
type Wisp = { x: number; y: number; w: number; v: number; a: number; rot: number };

// True star colours, from blue-white to orange.
const STAR_RGB: RGB[] = [[160, 184, 255], [205, 220, 255], [255, 255, 255], [255, 241, 214], [255, 210, 161]];

export default function WeatherSky({ icon, isNight, sunrise, sunset, windKmh, precipMm }: { icon: WeatherIconKind; isNight: boolean; sunrise: string; sunset: string; windKmh: number; precipMm: number | null }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sr = hm(sunrise);
    const ss = hm(sunset);
    const cover = COVER[icon];
    const wet = icon === "rain" || icon === "drizzle" || icon === "storm";
    const rain = wet ? (precipMm != null ? precipMm : icon === "drizzle" ? 0.4 : icon === "storm" ? 4 : 1.5) : 0;
    const slant = Math.min(0.55, windKmh / 45) * (windKmh > 3 ? 1 : 0);
    const windK = 0.35 + Math.min(windKmh, 50) / 14; // cloud speed multiplier

    let W = 0;
    let H = 0;
    let dpr = 1;
    let clouds: Cloud[] = [];
    let drops: Drop[] = [];
    let flakes: Flake[] = [];
    const splashes: Splash[] = [];
    let stars: Star[] = [];
    let wisps: Wisp[] = [];
    let beacons: { x: number; y: number; p: number }[] = [];
    let windows: { x: number; y: number; w: number; h: number; p: number; on: number }[] = [];
    const city = document.createElement("canvas"); // the skyline, drawn once per size
    const cloudLayer = document.createElement("canvas");
    const sprite = document.createElement("canvas"); // one soft cloud puff
    sprite.width = 256;
    sprite.height = 128;
    {
      const c = sprite.getContext("2d");
      if (c) {
        const r = rng(7);
        for (let i = 0; i < 14; i++) {
          const px = 40 + r() * 176;
          const py = 64 + (r() - 0.5) * 34;
          const pr = 22 + r() * 34;
          const g = c.createRadialGradient(px, py, 0, px, py, pr);
          g.addColorStop(0, "rgba(255,255,255,0.55)");
          g.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = g;
          c.beginPath();
          c.arc(px, py, pr, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    const wisp = document.createElement("canvas"); // one long, thin streak of high cirrus
    wisp.width = 512;
    wisp.height = 64;
    {
      const c = wisp.getContext("2d");
      if (c) {
        const r = rng(31);
        for (let i = 0; i < 26; i++) {
          const px = 24 + r() * 464;
          const py = 32 + (r() - 0.5) * 16;
          const pr = 10 + r() * 20;
          c.save();
          c.translate(px, py);
          c.scale(3.4, 0.42);
          const g = c.createRadialGradient(0, 0, 0, 0, 0, pr);
          g.addColorStop(0, "rgba(255,255,255,0.5)");
          g.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = g;
          c.beginPath();
          c.arc(0, 0, pr, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      }
    }
    const starGlow = STAR_RGB.map(([r, g, b]) => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 24;
      const c = cv.getContext("2d");
      if (c) {
        const gr = c.createRadialGradient(12, 12, 0, 12, 12, 12);
        gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
        gr.addColorStop(0.18, `rgba(${r},${g},${b},0.55)`);
        gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        c.fillStyle = gr;
        c.fillRect(0, 0, 24, 24);
      }
      return cv;
    });

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(200, Math.round(rect.width));
      H = Math.max(160, Math.round(rect.height));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      cloudLayer.width = W;
      cloudLayer.height = H;
      const r = rng(11);
      const nClouds = Math.round(cover * 11);
      clouds = Array.from({ length: nClouds }, (_, i) => {
        const layer = i % 3;
        return { x: r() * (W + 300) - 150, y: H * (0.06 + r() * 0.5) * (layer === 2 ? 0.8 : 1), w: W * (0.32 + r() * 0.32) * (layer === 0 ? 0.7 : layer === 2 ? 1.25 : 1), layer, v: (4 + layer * 5) * (0.8 + r() * 0.5), a: 0.35 + 0.45 * cover * (0.7 + r() * 0.3), s: r() };
      });
      const nDrops = wet ? Math.round(Math.min(280, 40 + rain * 36) * Math.min(1.4, W / 600)) : 0;
      drops = Array.from({ length: nDrops }, () => ({ x: r() * (W + 120) - 60, y: r() * H, v: (icon === "drizzle" ? 380 : 620 + Math.min(rain, 6) * 60) * (0.85 + r() * 0.3), len: (icon === "drizzle" ? 7 : 12 + Math.min(rain, 6) * 2) * (0.7 + r() * 0.6), a: 0.25 + r() * 0.4 }));
      flakes = icon === "snow" ? Array.from({ length: Math.round(70 * Math.min(1.4, W / 600)) }, () => ({ x: r() * W, y: r() * H, r: 1 + r() * 2.2, v: 28 + r() * 40, ph: r() * 6.28, a: 0.5 + r() * 0.5 })) : [];
      // The stars live on a disc turning round a point at the top of the sky, so the whole field can turn with the real time and still fill the card.
      const R = Math.hypot(W / 2, H);
      const nStars = Math.min(1700, Math.round((300 * Math.PI * R * R) / (W * H * 0.8)));
      stars = Array.from({ length: nStars }, () => {
        const b = Math.pow(r(), 3.4); // a few bright, most faint
        return { rho: Math.sqrt(r()) * R, th: r() * Math.PI * 2, r: 0.45 + b * 1.5, b, p: r() * 6.28, f: 1.6 + r() * 3.2, c: r() < 0.5 ? 2 : Math.floor(r() * 5) };
      });
      // Thin high cirrus, even in clear weather.
      wisps = Array.from({ length: 3 }, (_, i) => ({ x: r() * W, y: H * (0.1 + i * 0.13 + r() * 0.07), w: W * (0.55 + r() * 0.5), v: 1.6 + r() * 2.4, a: 0.5 + r() * 0.5, rot: -0.1 + r() * 0.05 }));

      // The skyline: two rows of towers, the far row paler.
      city.width = W;
      city.height = H;
      const cc = city.getContext("2d");
      windows = [];
      beacons = [];
      if (cc) {
        cc.clearRect(0, 0, W, H);
        const q = rng(23);
        for (let layer = 0; layer < 2; layer++) {
          let x = -10;
          while (x < W + 10) {
            const bw = 16 + q() * 34;
            const bh = H * (layer === 0 ? 0.1 + q() * 0.13 : 0.06 + q() * 0.12);
            cc.fillStyle = layer === 0 ? "rgba(9,13,32,0.78)" : "rgba(6,9,24,0.97)";
            cc.fillRect(x, H - bh, bw, bh);
            if (q() > 0.7) {
              // an antenna, with a red beacon on it
              const up = 10 + q() * 14;
              cc.fillRect(x + bw * 0.4, H - bh - up, 2, up + 4);
              if (layer === 1 || q() > 0.5) beacons.push({ x: x + bw * 0.4 + 1, y: H - bh - up, p: q() * 6.28 });
            }
            if (layer === 1) {
              for (let wy = H - bh + 6; wy < H - 5; wy += 8) {
                for (let wx = x + 4; wx < x + bw - 5; wx += 7) if (q() > 0.55) windows.push({ x: wx, y: wy, w: 3, h: 4, p: q() * 6.28, on: q() });
              }
            }
            x += bw + 1 + q() * 4;
          }
        }
      }
    };
    build();

    let last = performance.now();
    let flash = 0;
    let nextBolt = last + 3000 + Math.random() * 5000;
    let bolt: { x: number; y: number }[] = [];
    let shoot: { x: number; y: number; t: number } | null = null;
    let nextShoot = last + 4000 + Math.random() * 9000;
    let raf = 0;
    let visible = true;

    const draw = (now: number, dt: number) => {
      const t = now / 1000;
      const tm = jstMinutes(Date.now());
      const { sky, night } = skyAt(tm, sr, ss);
      // Weather drains and darkens the colours.
      const drain = cover * 0.78;
      const toGrey = (c: RGB): RGB => {
        const l = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) * (1 - cover * 0.28);
        return mixc(c, [l, l * 1.04, l * 1.12], drain);
      };
      const tp = toGrey(sky.top), md = toGrey(sky.mid), bt = toGrey(sky.bot);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, css(tp));
      g.addColorStop(0.55, css(md));
      g.addColorStop(1, css(bt));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Where the sun and the moon are. The sun crosses from sunrise to sunset (and carries on below the horizon, which tells us where the moon's lit side faces).
      // The moon keeps a real moon's timetable: it crosses the southern sky at (local noon + its phase through a day), so a new moon travels with the sun and
      // a full moon is highest at midnight; it is up for about twelve and a half hours.
      const horizon = H * 0.86;
      const phase = moonPhase(Date.now());
      const illum = (1 - Math.cos(phase * Math.PI * 2)) / 2;
      const fs = (tm - sr) / (ss - sr);
      const sunX = W * (0.08 + 0.84 * fs);
      const sunY = horizon - Math.sin(Math.PI * fs) * H * 0.62;
      let dm = tm - (((sr + ss) / 2 + phase * 1440) % 1440);
      if (dm > 720) dm -= 1440;
      if (dm < -720) dm += 1440;
      const fm = (dm + 372) / 744;
      const moonUp = fm >= 0 && fm <= 1;
      const moonX = W * (0.08 + 0.84 * fm);
      const moonY = horizon - Math.sin(Math.PI * Math.min(1, Math.max(0, fm))) * H * 0.6;

      // The air: at night the city lights a dome of orange over the skyline (which low cloud reflects); by day a pale haze lies along the horizon.
      if (night) {
        ctx.save();
        ctx.translate(W * 0.5, H);
        ctx.scale(1, 0.5);
        const dome = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.8);
        dome.addColorStop(0, `rgba(255,150,80,${0.22 * (1 - cover * 0.3)})`);
        dome.addColorStop(0.45, `rgba(255,120,90,${0.08 * (1 - cover * 0.3)})`);
        dome.addColorStop(1, "rgba(255,120,90,0)");
        ctx.fillStyle = dome;
        ctx.fillRect(-W, -H * 2, W * 2, H * 2);
        ctx.restore();
      } else {
        const haze = ctx.createLinearGradient(0, H * 0.5, 0, H);
        haze.addColorStop(0, "rgba(255,255,255,0)");
        haze.addColorStop(1, css(mixc(bt, [255, 255, 255], 0.5), 0.3 * (1 - cover * 0.5)));
        ctx.fillStyle = haze;
        ctx.fillRect(0, H * 0.5, W, H * 0.5);
      }
      // Moonlight lifts the sky round the moon.
      if (night && moonUp && cover < 0.95) {
        const R = W * 0.55;
        const ml = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, R);
        ml.addColorStop(0, `rgba(120,150,235,${0.2 * illum * (1 - cover)})`);
        ml.addColorStop(1, "rgba(120,150,235,0)");
        ctx.fillStyle = ml;
        ctx.fillRect(moonX - R, moonY - R, R * 2, R * 2);
      }

      // Stars (clear nights): the field turns with the real time; faint ones thin out toward the hazy horizon and near the moon.
      const starOn = night ? 1 - cover : 0;
      if (starOn > 0.05) {
        const rot = (tm / 1440) * Math.PI * 2 * 1.0027;
        const px = W * 0.5;
        const py = 0;
        const skyH = H * 0.84;
        const cr = Math.cos(rot);
        const sr2 = Math.sin(rot);
        for (const s of stars) {
          const cth = Math.cos(s.th);
          const sth = Math.sin(s.th);
          const x = px + s.rho * (cth * cr - sth * sr2);
          const y = py + s.rho * (sth * cr + cth * sr2);
          if (x < -4 || x > W + 4 || y < -4 || y > skyH) continue;
          let a = (0.3 + 0.7 * s.b) * Math.min(1, ((skyH - y) / (H * 0.4)) ** 0.9);
          if (moonUp) a *= 1 - 0.7 * illum * Math.exp(-(((x - moonX) ** 2 + (y - moonY) ** 2) / (W * 0.3) ** 2));
          a *= 0.72 + 0.28 * Math.sin(t * s.f + s.p);
          a *= starOn * (1 - illum * 0.25 * (1 - s.b));
          if (a < 0.02) continue;
          ctx.globalAlpha = a;
          const [r, g, b] = STAR_RGB[s.c];
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          // a sharp point for every star; only the brightest few have a small halo
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.35, s.r * 0.42), 0, Math.PI * 2);
          ctx.fill();
          if (s.b > 0.6) {
            const sz = 5 + s.b * 7;
            ctx.globalAlpha = a * 0.55;
            ctx.drawImage(starGlow[s.c], x - sz / 2, y - sz / 2, sz, sz);
          }
        }
        ctx.globalAlpha = 1;
        if (!reduced && now > nextShoot && !shoot) {
          shoot = { x: W * (0.2 + Math.random() * 0.6), y: H * (0.05 + Math.random() * 0.25), t: 0 };
          nextShoot = now + 12000 + Math.random() * 14000;
        }
        if (shoot) {
          shoot.t += dt;
          const k = shoot.t / 0.9;
          if (k >= 1) shoot = null;
          else {
            const x = shoot.x + k * 160, y = shoot.y + k * 70;
            const tail = ctx.createLinearGradient(x - 70, y - 30, x, y);
            tail.addColorStop(0, "rgba(255,255,255,0)");
            tail.addColorStop(1, `rgba(255,255,255,${0.85 * (1 - k)})`);
            ctx.strokeStyle = tail;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x - 70, y - 30);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
        }
      }

      // The sun by day, with a bloom and faint rays; the moon in its real phase, by night and, pale, by day when it is up.
      const dimBy = 1 - Math.min(1, cover * 0.9);
      if (tm >= sr - 25 && tm <= ss + 25) {
        const f = Math.min(1, Math.max(0, fs));
        const sx = sunX;
        const sy = horizon - Math.sin(Math.PI * f) * H * 0.62;
        const low = 1 - Math.sin(Math.PI * f); // near the horizon: redder and larger
        const rr = 15 + low * 7;
        // faint rays, turning very slowly
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t * 0.012);
        ctx.fillStyle = `rgba(255,240,205,${0.028 * dimBy * (1 - low * 0.6)})`;
        for (let i = 0; i < 9; i++) {
          ctx.rotate((Math.PI * 2) / 9 + 0.21 * Math.sin(i * 2.3));
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(W * 0.6, -rr * (0.3 + 0.35 * ((i * 7) % 3) / 2));
          ctx.lineTo(W * 0.6, rr * (0.3 + 0.35 * ((i * 5) % 3) / 2));
          ctx.fill();
        }
        ctx.restore();
        const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr * 9);
        gl.addColorStop(0, `rgba(255,${210 - low * 60 | 0},${140 - low * 40 | 0},${(0.62 + low * 0.2) * dimBy})`);
        gl.addColorStop(0.3, `rgba(255,${190 - low * 50 | 0},${120 - low * 40 | 0},${0.22 * dimBy})`);
        gl.addColorStop(1, "rgba(255,170,100,0)");
        ctx.fillStyle = gl;
        ctx.fillRect(sx - rr * 9, sy - rr * 9, rr * 18, rr * 18);
        ctx.fillStyle = `rgba(255,${244 - low * 70 | 0},${210 - low * 90 | 0},${0.97 * dimBy})`;
        ctx.beginPath();
        ctx.arc(sx, sy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (moonUp && cover < 0.95) {
        const toSun = Math.atan2(sunY - moonY, sunX - moonX);
        const lowM = 1 - Math.sin(Math.PI * Math.min(1, Math.max(0, fm)));
        const mr = Math.min(30, Math.max(17, W * 0.036)) * (1 + lowM * 0.22); // grows with the card, and a little larger low in the sky
        if (night) {
          // a thin cloud makes a ring round the moon
          if (cover > 0.15 && cover < 0.7) {
            ctx.save();
            ctx.globalAlpha = 0.06 * illum * (1 - Math.abs(cover - 0.4) * 2.2);
            ctx.strokeStyle = "rgba(210,220,255,1)";
            ctx.lineWidth = mr * 0.28;
            ctx.beginPath();
            ctx.arc(moonX, moonY, mr * 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          drawMoon(ctx, moonX, moonY, mr, phase, Math.max(0, dimBy - 0.05), toSun, true);
        } else if (tm > sr + 20 && tm < ss - 20) {
          // by day the moon is only a pale disc in the blue
          drawMoon(ctx, moonX, moonY, mr, phase, 0.5 * dimBy, toSun, false);
        }
      }

      // Thin high cirrus, even when the sky is clear.
      if (cover < 0.85 && !(icon === "fog")) {
        const wa = (night ? 0.07 : 0.13) * (1 - cover);
        for (const w of wisps) {
          if (!reduced) {
            w.x += w.v * windK * dt;
            if (w.x > W + w.w * 0.5) w.x = -w.w * 0.6;
          }
          ctx.save();
          ctx.globalAlpha = wa * w.a;
          ctx.translate(w.x, w.y);
          ctx.rotate(w.rot);
          ctx.drawImage(wisp, -w.w / 2, -w.w * 0.06, w.w, w.w * 0.12);
          ctx.restore();
        }
      }

      // Clouds, on their own layer so they can be tinted by the light as a whole.
      if (clouds.length) {
        const cl = cloudLayer.getContext("2d");
        if (cl) {
          cl.clearRect(0, 0, W, H);
          for (const c of clouds) {
            if (!reduced) {
              c.x += c.v * windK * dt;
              if (c.x > W + c.w * 0.6) c.x = -c.w * 1.1;
            }
            cl.globalAlpha = c.a * (c.layer === 0 ? 0.7 : 1);
            cl.drawImage(sprite, c.x - c.w / 2, c.y - c.w * 0.25 + Math.sin(t * 0.15 + c.s * 6) * 3, c.w, c.w * 0.5);
          }
          cl.globalAlpha = 1;
          // Tint: the sky's own bottom colour near the horizon (warm at sunrise and sunset), grey and dark when it is stormy.
          cl.globalCompositeOperation = "source-atop";
          const lit = night ? mixc(mixc(bt, [235, 238, 250], 0.12), [200, 130, 96], 0.28 * (1 - illum * 0.5)) : mixc(bt, [235, 238, 250], 0.55);
          const shade = mixc(md, [50, 56, 84], cover * 0.7);
          const tg = cl.createLinearGradient(0, 0, 0, H * 0.7);
          tg.addColorStop(0, css(shade, 0.85));
          tg.addColorStop(1, css(lit, 0.9));
          cl.fillStyle = tg;
          cl.fillRect(0, 0, W, H);
          // moonlight on the clouds near the moon
          if (night && moonUp) {
            const R = W * 0.5;
            const mg = cl.createRadialGradient(moonX, moonY, 0, moonX, moonY, R);
            mg.addColorStop(0, `rgba(200,214,255,${0.5 * (0.25 + illum)})`);
            mg.addColorStop(1, "rgba(200,214,255,0)");
            cl.fillStyle = mg;
            cl.fillRect(0, 0, W, H);
          }
          cl.globalCompositeOperation = "source-over";
          ctx.drawImage(cloudLayer, 0, 0);
        }
      }

      // Fog: slow pale bands.
      if (icon === "fog") {
        for (let i = 0; i < 4; i++) {
          const y = H * (0.34 + i * 0.13);
          const x = ((t * (6 + i * 3)) % (W * 1.6)) - W * 0.3;
          const fg = ctx.createLinearGradient(0, y - 40, 0, y + 40);
          fg.addColorStop(0, "rgba(220,228,245,0)");
          fg.addColorStop(0.5, `rgba(220,228,245,${0.16 + i * 0.03})`);
          fg.addColorStop(1, "rgba(220,228,245,0)");
          ctx.fillStyle = fg;
          ctx.fillRect(x - W, y - 40, W * 2.2, 80);
        }
      }

      // Rain: streaks slanted by the wind, with splashes where they land on the roofs.
      if (drops.length) {
        ctx.strokeStyle = "rgba(190,215,255,1)";
        ctx.lineWidth = icon === "drizzle" ? 0.8 : 1.1;
        const ground = H * 0.9;
        for (const d of drops) {
          if (!reduced) {
            d.y += d.v * dt;
            d.x += d.v * dt * slant;
          }
          if (d.y > ground) {
            if (!reduced && splashes.length < 40 && Math.random() < 0.35) splashes.push({ x: d.x, y: ground + Math.random() * (H - ground) * 0.6, t: 0 });
            d.y = -d.len;
            d.x = Math.random() * (W + 120) - 60;
          }
          ctx.globalAlpha = d.a;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * slant * 1.6, d.y - d.len);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (let i = splashes.length - 1; i >= 0; i--) {
          const sp = splashes[i];
          sp.t += dt;
          if (sp.t > 0.45) {
            splashes.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(200,220,255,${0.45 * (1 - sp.t / 0.45)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y, 2 + sp.t * 16, 0.8 + sp.t * 5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Snow.
      if (flakes.length) {
        ctx.fillStyle = "#fff";
        for (const f of flakes) {
          if (!reduced) {
            f.y += f.v * dt;
            f.x += Math.sin(t * 0.9 + f.ph) * 14 * dt + slant * 40 * dt;
            if (f.y > H) {
              f.y = -4;
              f.x = Math.random() * W;
            }
          }
          ctx.globalAlpha = f.a;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // The city, with its windows lit after dark.
      ctx.drawImage(city, 0, 0, W, H);
      const lights = night || icon === "storm" || cover > 0.85 ? 1 : tm > ss - 30 || tm < sr + 30 ? 0.6 : 0;
      if (lights > 0) {
        for (const w of windows) {
          if (w.on > 0.45 + (1 - lights) * 0.5) continue;
          const wa = lights * (0.45 + 0.35 * Math.sin(t * 0.4 + w.p));
          ctx.fillStyle = `rgba(255,190,110,${wa * 0.16})`;
          ctx.fillRect(w.x - 1.5, w.y - 1.5, w.w + 3, w.h + 3);
          ctx.fillStyle = `rgba(255,212,130,${wa})`;
          ctx.fillRect(w.x, w.y, w.w, w.h);
        }
        // red aviation beacons blinking on the antennas
        for (const bcn of beacons) {
          const k = Math.pow(Math.max(0, Math.sin(t * 2.1 + bcn.p)), 8);
          if (k < 0.04) continue;
          const rg = ctx.createRadialGradient(bcn.x, bcn.y, 0, bcn.x, bcn.y, 6);
          rg.addColorStop(0, `rgba(255,70,60,${0.95 * k * lights})`);
          rg.addColorStop(1, "rgba(255,70,60,0)");
          ctx.fillStyle = rg;
          ctx.fillRect(bcn.x - 6, bcn.y - 6, 12, 12);
        }
      }

      // Lightning.
      if (icon === "storm") {
        if (!reduced && now > nextBolt) {
          flash = 1;
          let x = W * (0.15 + Math.random() * 0.7);
          let y = 0;
          bolt = [{ x, y }];
          while (y < H * 0.62) {
            y += 14 + Math.random() * 22;
            x += (Math.random() - 0.5) * 34;
            bolt.push({ x, y });
          }
          nextBolt = now + 4500 + Math.random() * 9000;
        }
        if (flash > 0) {
          ctx.fillStyle = `rgba(210,220,255,${flash * 0.28})`;
          ctx.fillRect(0, 0, W, H);
          if (flash > 0.55 && bolt.length) {
            ctx.strokeStyle = `rgba(245,248,255,${flash})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = "rgba(180,200,255,0.9)";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            bolt.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
          flash = Math.max(0, flash - dt * 2.6);
        }
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(now, dt);
    };

    draw(performance.now(), 0.016);
    const ro = new ResizeObserver(() => {
      build();
      draw(performance.now(), 0.016);
    });
    ro.observe(canvas);
    let io: IntersectionObserver | undefined;
    if (!reduced) {
      io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.01 });
      io.observe(canvas);
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
    };
  }, [icon, sunrise, sunset, windKmh, precipMm, reduced]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-br from-[#101a3d] to-[#080c20]" data-night={isNight ? "1" : "0"}>
      <canvas ref={ref} className="h-full w-full" />
      {/* Legibility: darken toward the text and the bottom edge. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a]/60 via-[#070b1a]/15 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b1a]/60 via-transparent to-[#070b1a]/10" />
    </div>
  );
}
