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

function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, phase: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4);
  glow.addColorStop(0, "rgba(170,185,255,0.28)");
  glow.addColorStop(1, "rgba(170,185,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  // the dark side, faint
  ctx.fillStyle = "rgba(60,70,110,0.55)";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // the lit part
  const k = Math.cos(phase * Math.PI * 2);
  const waxing = phase < 0.5;
  ctx.fillStyle = "#ece9f7";
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
  const midRight = waxing ? k > 0 : k < 0;
  ctx.ellipse(x, y, Math.max(0.01, Math.abs(k)) * r, r, 0, Math.PI / 2, -Math.PI / 2, midRight);
  ctx.closePath();
  ctx.fill();
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
    let stars: { x: number; y: number; r: number; p: number }[] = [];
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
      stars = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H * 0.62, r: 0.5 + r() * 1.3, p: r() * 6.28 }));

      // The skyline: two rows of towers, the far row paler.
      city.width = W;
      city.height = H;
      const cc = city.getContext("2d");
      windows = [];
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
            if (q() > 0.7) cc.fillRect(x + bw * 0.4, H - bh - 10 - q() * 14, 2, 14 + q() * 12); // an antenna
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

      // Stars (clear nights).
      const starOn = night ? 1 - cover : 0;
      if (starOn > 0.05) {
        for (const s of stars) {
          ctx.globalAlpha = starOn * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.p)));
          ctx.fillStyle = "#fff";
          ctx.fillRect(s.x, s.y, s.r, s.r);
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

      // The sun by day, along its arc from sunrise to sunset; the moon by night, in its real phase.
      const horizon = H * 0.86;
      const dimBy = 1 - Math.min(1, cover * 0.9);
      if (tm >= sr - 25 && tm <= ss + 25) {
        const f = Math.min(1, Math.max(0, (tm - sr) / (ss - sr)));
        const sx = W * (0.08 + 0.84 * f);
        const sy = horizon - Math.sin(Math.PI * f) * H * 0.62;
        const low = 1 - Math.sin(Math.PI * f); // near the horizon: redder and larger
        const rr = 15 + low * 7;
        const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr * 7);
        gl.addColorStop(0, `rgba(255,${200 - low * 60 | 0},${130 - low * 40 | 0},${(0.55 + low * 0.2) * dimBy})`);
        gl.addColorStop(1, "rgba(255,170,100,0)");
        ctx.fillStyle = gl;
        ctx.fillRect(sx - rr * 7, sy - rr * 7, rr * 14, rr * 14);
        ctx.fillStyle = `rgba(255,${240 - low * 70 | 0},${200 - low * 90 | 0},${0.95 * dimBy})`;
        ctx.beginPath();
        ctx.arc(sx, sy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (night && cover < 0.9) {
        const len = 24 * 60 - ss + sr;
        const since = tm >= ss ? tm - ss : tm + 24 * 60 - ss;
        const f = Math.min(1, Math.max(0, since / len));
        drawMoon(ctx, W * (0.08 + 0.84 * f), horizon - Math.sin(Math.PI * f) * H * 0.6, 15, moonPhase(Date.now()), Math.max(0, dimBy - 0.1));
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
          const lit = mixc(bt, [235, 238, 250], night ? 0.12 : 0.55);
          const shade = mixc(md, [50, 56, 84], cover * 0.7);
          const tg = cl.createLinearGradient(0, 0, 0, H * 0.7);
          tg.addColorStop(0, css(shade, 0.85));
          tg.addColorStop(1, css(lit, 0.9));
          cl.fillStyle = tg;
          cl.fillRect(0, 0, W, H);
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
          ctx.fillStyle = `rgba(255,212,130,${lights * (0.45 + 0.35 * Math.sin(t * 0.4 + w.p))})`;
          ctx.fillRect(w.x, w.y, w.w, w.h);
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
