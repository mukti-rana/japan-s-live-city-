"use client";

import { useEffect, useId, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { BONES, IMG_ASPECT, sharedSim } from "@/components/auth/treeRig";

// A few petals and leaves in the air over the sign-in picture, blown by the same wind that bends the branches (treeRig.ts).
//
// They are not on a track: each one is a little body with a velocity that is pulled toward the wind where it is (so a gust sweeping
// through the blossom visibly carries petals away, and in a lull they sink straight down), falls at its own rate, sways, and tumbles
// in 3D faster when the air moves past it faster. New petals come loose from the twigs of the tree itself, mostly as a gust passes,
// one or two at a time; now and then a petal or leaf drifts in from above, and every so often a large, out-of-focus one passes
// close to the viewer. There are never more than a handful in the air. Nothing is created or destroyed per frame: a fixed pool of
// elements is moved with transform only. Stopped while the tab is hidden; not shown at all for visitors who ask for less motion.

const PETAL = "M0 0 C -2.6 -1 -4.6 -4.6 -3.3 -7.1 C -2.6 -8.4 -1.1 -8.4 0 -7.2 C 1.1 -8.4 2.6 -8.4 3.3 -7.1 C 4.6 -4.6 2.6 -1 0 0 Z";
const LEAF = "M0 0 C -2.6 -2.2 -2.8 -6.8 0 -10 C 2.8 -6.8 2.6 -2.2 0 0 Z";

const POOL = 17; // 0..13 ordinary, 14..16 the large near ones
const NEAR = 14;

type P = { alive: boolean; kind: "petal" | "leaf"; x: number; y: number; vx: number; vy: number; size: number; fall: number; rx: number; ry: number; rz: number; srx: number; sry: number; srz: number; ph: number; fl: number; age: number; life: number; blur: number };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export default function PetalField({ anchor }: { anchor: [number, number] }) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const petalFill = useId();
  const leafFill = useId();

  useEffect(() => {
    const host = root.current;
    if (!host || reduced) return;
    const sim = sharedSim();
    const pool: P[] = Array.from({ length: POOL }, () => ({ alive: false, kind: "petal", x: 0, y: 0, vx: 0, vy: 0, size: 12, fall: 40, rx: 0, ry: 0, rz: 0, srx: 1, sry: 1, srz: 1, ph: 0, fl: 1, age: 0, life: 20, blur: 0 }));
    let W = host.clientWidth;
    let H = host.clientHeight;
    const ro = new ResizeObserver(() => {
      W = host.clientWidth;
      H = host.clientHeight;
    });
    ro.observe(host);
    const map = () => {
      const va = W / Math.max(H, 1);
      const sx = va < IMG_ASPECT ? va / IMG_ASPECT : 1;
      const sy = va < IMG_ASPECT ? 1 : IMG_ASPECT / va;
      return { sx, sy, ox: anchor[0] * (1 - sx), oy: anchor[1] * (1 - sy) };
    };
    // Twig tips in the thin parts of the tree (where petals can come loose).
    const loose = BONES.map((b, i) => (b.cls >= 2 && !b.n.startsWith("g") ? i : -1)).filter((i) => i >= 0);

    const spawn = (slot: number, mode: "shed" | "sky" | "near") => {
      const p = pool[slot];
      const { sx, sy, ox, oy } = map();
      p.kind = mode === "sky" && Math.random() < 0.3 ? "leaf" : "petal";
      p.alive = true;
      p.age = 0;
      p.ph = rnd(0, 6.28);
      p.fl = rnd(0.7, 1.6);
      p.rx = rnd(0, 6.28);
      p.ry = rnd(0, 6.28);
      p.rz = rnd(0, 6.28);
      p.srx = rnd(1.5, 4.5) * (Math.random() < 0.5 ? -1 : 1);
      p.sry = rnd(1.2, 4) * (Math.random() < 0.5 ? -1 : 1);
      p.srz = rnd(0.5, 2.2) * (Math.random() < 0.5 ? -1 : 1);
      p.vx = rnd(0, 20);
      p.vy = 0;
      if (mode === "shed") {
        const [tx, ty] = sim.tip(loose[Math.floor(Math.random() * loose.length)]);
        p.x = ((tx / IMG_ASPECT - ox) / sx) * W + rnd(-10, 10);
        p.y = ((ty - oy) / sy) * H + rnd(-8, 8);
        p.size = rnd(11, 17);
        p.fall = rnd(26, 46);
        p.blur = 0;
        p.life = rnd(14, 24);
      } else if (mode === "sky") {
        p.x = rnd(-0.02, 0.55) * W;
        p.y = -20;
        p.size = rnd(10, 16);
        p.fall = rnd(30, 52);
        p.blur = Math.random() < 0.25 ? 0.5 : 0;
        p.life = rnd(18, 30);
      } else {
        p.x = rnd(-0.05, 0.4) * W;
        p.y = -60;
        p.size = rnd(42, 58);
        p.fall = rnd(48, 70);
        p.blur = 3.2;
        p.life = rnd(16, 24);
        p.kind = "petal";
      }
      const el = els.current[slot];
      if (el) {
        el.style.width = `${p.size}px`;
        el.style.height = `${p.size * 1.25}px`;
        el.style.filter = p.blur ? `blur(${p.blur}px)` : "";
        el.dataset.kind = p.kind;
      }
    };

    let last = performance.now();
    let nextSky = last + 1500;
    let nextNear = last + 6000;
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      sim.step(t);
      const { sx, sy, ox, oy } = map();
      const alive = pool.filter((q, i) => q.alive && i < NEAR).length;

      // Petals come loose from the twigs while the wind is up (a few seconds after each gust arrives), one now and then.
      const [wx, wy] = sim.wind(0.25 * IMG_ASPECT, 0.2, t);
      const mag = Math.hypot(wx, wy);
      if (mag > 0.25 && Math.random() < dt * (mag - 0.2) * 1.5) {
        const slot = alive < 7 ? pool.findIndex((q, i) => !q.alive && i < NEAR - 3) : -1;
        if (slot >= 0) spawn(slot, "shed");
      }
      if (now > nextSky && alive < 6) {
        const slot = pool.findIndex((q, i) => !q.alive && i < NEAR);
        if (slot >= 0) spawn(slot, "sky");
        nextSky = now + rnd(5000, 11000);
      }
      if (now > nextNear) {
        const slot = pool.findIndex((q, i) => !q.alive && i >= NEAR);
        if (slot >= 0) spawn(slot, "near");
        nextNear = now + rnd(16000, 26000);
      }

      for (let i = 0; i < POOL; i++) {
        const p = pool[i];
        const el = els.current[i];
        if (!p.alive || !el) {
          if (el && el.style.opacity !== "0") el.style.opacity = "0";
          continue;
        }
        p.age += dt;
        // The wind where the petal is (picture space), and the speed it asks for.
        const ux = ox + (p.x / Math.max(W, 1)) * sx;
        const uy = oy + (p.y / Math.max(H, 1)) * sy;
        const [pwx, pwy] = sim.wind(ux * IMG_ASPECT, uy, t + p.ph);
        const near = p.blur > 2 ? 0.55 : 1;
        const targetVx = (pwx * 560 + 14) * near + Math.sin(t * p.fl * 1.7 + p.ph) * 22;
        const targetVy = p.fall * near + pwy * 240 - Math.max(0, mag - 0.5) * 38 + Math.sin(t * p.fl * 1.1 + p.ph * 2) * 9;
        const k = 1 - Math.exp(-dt * 1.5);
        p.vx += (targetVx - p.vx) * k;
        p.vy += (targetVy - p.vy) * k;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Tumbling quickens when the air is moving past.
        const air = 1 + Math.hypot(targetVx - p.vx, targetVy - p.vy) * 0.01 + Math.hypot(p.vx, p.vy) * 0.004;
        p.rx += p.srx * dt * air;
        p.ry += p.sry * dt * air;
        p.rz += p.srz * dt * air * 0.6;
        if (p.age > p.life || p.x > W + 80 || p.y > H + 80 || p.x < -120) {
          p.alive = false;
          el.style.opacity = "0";
          continue;
        }
        const fadeIn = Math.min(1, p.age / 0.6);
        const fadeOut = Math.min(1, (p.life - p.age) / 1.8);
        el.style.opacity = String(0.95 * fadeIn * Math.max(0, fadeOut));
        el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) rotateZ(${p.rz.toFixed(2)}rad) rotateX(${p.rx.toFixed(2)}rad) rotateY(${p.ry.toFixed(2)}rad)`;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [anchor, reduced]);

  // Always rendered (so the server and the browser agree); for visitors who ask for less motion the pieces simply never appear.
  return (
    <div ref={root} aria-hidden="true" className="auth-petals absolute inset-0 overflow-hidden">
      <svg width="0" height="0" className="absolute">
        <defs>
          <radialGradient id={petalFill} cx="0.5" cy="1" r="1.05">
            <stop offset="0" stopColor="#e65f93" />
            <stop offset="0.25" stopColor="#f7a0c1" />
            <stop offset="0.65" stopColor="#fbd7e5" />
            <stop offset="1" stopColor="#fdf4f8" />
          </radialGradient>
          <linearGradient id={leafFill} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#8e3b3a" />
            <stop offset="1" stopColor="#c8644a" />
          </linearGradient>
        </defs>
      </svg>
      {Array.from({ length: POOL }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            els.current[i] = el;
          }}
          className="auth-petal"
          style={{ opacity: 0, width: 12, height: 15 }}
        >
          <svg viewBox="-4 -10 8 11" className="block h-full w-full">
            <g className="auth-bit-petal">
              <path d={PETAL} fill={`url(#${petalFill})`} stroke="#f0a3c0" strokeWidth="0.12" />
              <path d="M0 -0.6 L0 -5.4" stroke="#e8749f" strokeWidth="0.14" opacity="0.4" fill="none" />
            </g>
            <g className="auth-bit-leaf">
              <path d={LEAF} fill={`url(#${leafFill})`} />
              <path d="M0 -0.6 L0 -8.6" stroke="#e9a37f" strokeWidth="0.18" opacity="0.7" fill="none" />
            </g>
          </svg>
        </span>
      ))}
    </div>
  );
}
