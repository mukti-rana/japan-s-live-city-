"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type { WeatherIconKind } from "@/lib/services/weather";

// Rain on the window. When it is really raining (rain, drizzle or a storm), the card looks like a pane of glass with the weather
// on it: small beads form, grow as they gather neighbours, and once heavy enough run down the glass in fits and starts, leaving a thin
// trail of tiny beads that fades; a running drop swallows any bead in its path. How many beads form follows the real rainfall this hour
// (millimetres; the condition decides when the figure is missing). Each bead is drawn as a little lens: a bright catch-light on the
// upper side, a dark rim underneath and a clear middle, so it reads as water on glass.
// Nothing is drawn in dry weather. Under reduced motion one still set of beads is drawn. It only runs while on screen and the tab is
// visible, and the canvas is capped at 1.5x pixel density. Decoration only (aria-hidden).
type Bead = { x: number; y: number; r: number; vy: number; pause: number; trailAt: number; slide: boolean; seed: number };
type Dot = { x: number; y: number; r: number; a: number };

export default function WindowDrops({ icon, precipMm, windKmh = 0 }: { icon: WeatherIconKind; precipMm: number | null; windKmh?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const wet = icon === "rain" || icon === "drizzle" || icon === "storm";

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !wet) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const intensity = precipMm !== null && precipMm > 0 ? Math.min(1, Math.max(0.25, precipMm / 5)) : icon === "storm" ? 1 : icon === "rain" ? 0.65 : 0.3;
    const lean = Math.max(-0.4, Math.min(0.4, windKmh / 70)); // the wind blows runs sideways a little

    let W = 0;
    let H = 0;
    let dpr = 1;
    let beads: Bead[] = [];
    let dots: Dot[] = [];
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let spawn = 0;

    const make = (y?: number): Bead => ({ x: Math.random() * W, y: y ?? Math.random() * H, r: 1 + Math.random() * 2.2, vy: 0, pause: 0, trailAt: 0, slide: false, seed: Math.random() * 10 });
    const size = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const bead = (b: Bead) => {
      const rx = b.r * (b.slide ? 0.82 : 1);
      const ry = b.r * (b.slide ? 1.2 : 1);
      const g = ctx.createRadialGradient(b.x - rx * 0.3, b.y - ry * 0.35, rx * 0.08, b.x, b.y, ry);
      g.addColorStop(0, "rgba(255,255,255,0.5)");
      g.addColorStop(0.45, "rgba(200,218,255,0.1)");
      g.addColorStop(1, "rgba(6,12,30,0.4)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // the catch-light, and the lower rim
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.ellipse(b.x - rx * 0.32, b.y - ry * 0.42, Math.max(0.5, rx * 0.2), Math.max(0.5, ry * 0.15), -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, rx, ry, 0, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    };

    const step = (dt: number) => {
      // new beads form
      spawn += dt * (3 + intensity * 15);
      while (spawn > 1) {
        spawn -= 1;
        if (beads.length < 40 + intensity * 70) beads.push(make());
      }
      for (const b of beads) {
        if (!b.slide) {
          b.r += dt * (0.08 + intensity * 0.35);
          if (b.r > 3.6 + Math.random() * 2.2) {
            b.slide = true;
            b.vy = 14 + Math.random() * 20;
          }
        } else {
          // runs in fits and starts
          if (b.pause > 0) b.pause -= dt;
          else {
            b.y += b.vy * dt * (1 + b.r * 0.12);
            b.x += lean * b.vy * dt * 0.4 + Math.sin(b.y * 0.05 + b.seed) * 0.12;
            b.trailAt += b.vy * dt;
            if (Math.random() < dt * 0.9) {
              b.pause = 0.1 + Math.random() * 0.5;
              b.vy = 12 + Math.random() * 38;
            }
            if (b.trailAt > 7) {
              b.trailAt = 0;
              dots.push({ x: b.x + (Math.random() - 0.5) * 0.6, y: b.y - b.r * 1.3, r: Math.max(0.5, b.r * 0.2 + Math.random() * 0.5), a: 0.5 });
              b.r = Math.max(2.6, b.r * 0.985); // a run loses a little water to its trail
            }
          }
        }
      }
      // a running drop swallows a bead in its way
      for (const b of beads) {
        if (!b.slide) continue;
        for (const o of beads) {
          if (o === b || o.slide) continue;
          const dx = o.x - b.x;
          const dy = o.y - b.y;
          if (dx * dx + dy * dy < (b.r + o.r) * (b.r + o.r) * 0.7) {
            b.r = Math.min(7, Math.sqrt(b.r * b.r + o.r * o.r * 0.6));
            o.r = -1;
          }
        }
      }
      beads = beads.filter((b) => b.r > 0 && b.y < H + 14);
      for (const d of dots) d.a -= dt * 0.1;
      dots = dots.filter((d) => d.a > 0.02);
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        ctx.fillStyle = `rgba(215,228,255,${d.a * 0.35})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of beads) bead(b);
    };

    size();
    if (reduced) {
      for (let i = 0; i < 22 + intensity * 30; i++) beads.push(make());
      draw();
      return;
    }
    // start with the glass already wet
    for (let i = 0; i < 18 + intensity * 40; i++) {
      const b = make();
      b.r = 1 + Math.random() * 3;
      beads.push(b);
    }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;
      step(dt);
      draw();
    };
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(() => {
      size();
      draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.01 });
    io.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [wet, icon, precipMm, windKmh, reduced]);

  if (!wet) return null;
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
