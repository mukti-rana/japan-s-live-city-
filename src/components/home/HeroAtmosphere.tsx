"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type { WeatherIconKind } from "@/lib/services/weather";
import type { Season } from "@/lib/weather/time";

type ParticleMode = "sakura" | "rain" | "snow" | "glow" | "none";

function particleModeFor(condition: WeatherIconKind, season: Season, isNight: boolean): ParticleMode {
  if (season === "spring" && (condition === "clear" || condition === "partly")) return "sakura";
  if (condition === "rain" || condition === "drizzle" || condition === "storm") return "rain";
  if (condition === "snow") return "snow";
  if (isNight) return "glow";
  return "none";
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vr: number;
  opacity: number;
  phase: number;
}

function makeParticles(mode: ParticleMode, width: number, height: number): Particle[] {
  const count = mode === "sakura" ? 20 : mode === "rain" ? 50 : mode === "snow" ? 28 : mode === "glow" ? 16 : 0;
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: mode === "sakura" ? (Math.random() - 0.5) * 0.4 : mode === "rain" ? -0.6 : mode === "snow" ? (Math.random() - 0.5) * 0.3 : 0,
    vy:
      mode === "sakura"
        ? 0.3 + Math.random() * 0.4
        : mode === "rain"
          ? 4 + Math.random() * 2.5
          : mode === "snow"
            ? 0.4 + Math.random() * 0.5
            : 0,
    size: mode === "sakura" ? 4 + Math.random() * 3 : mode === "snow" ? 1.5 + Math.random() * 2 : mode === "glow" ? 1.5 + Math.random() * 2 : 0,
    rotation: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.02,
    opacity: 0.4 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  }));
}

// Full HTML5 Canvas atmosphere layer for the hero background — distinct
// from WeatherScene's DOM/motion particles (used for the smaller weather
// cards). Canvas is a better fit here for a larger particle count across a
// full-bleed hero. Driven entirely by real condition/season/day-night data
// already resolved by the caller.
export default function HeroAtmosphere({
  condition,
  season,
  isNight,
  className = "",
}: {
  condition: WeatherIconKind;
  season: Season;
  isNight: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();
  const mode = particleModeFor(condition, season, isNight);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduceMotion || mode === "none") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frameId = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = makeParticles(mode, width, height);
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        p.phase += 0.03;

        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx!.save();
        if (mode === "sakura") {
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.rotation);
          ctx!.fillStyle = `rgba(255, 179, 209, ${p.opacity})`;
          ctx!.beginPath();
          ctx!.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx!.fill();
        } else if (mode === "rain") {
          ctx!.strokeStyle = `rgba(155, 200, 255, ${p.opacity})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p.x + p.vx * 3, p.y - 14);
          ctx!.stroke();
        } else if (mode === "snow") {
          ctx!.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        } else if (mode === "glow") {
          const twinkle = 0.3 + Math.abs(Math.sin(p.phase)) * 0.5;
          ctx!.fillStyle = `rgba(200, 220, 255, ${twinkle})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      }

      frameId = requestAnimationFrame(draw);
    }

    resize();
    frameId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [mode, reduceMotion]);

  if (reduceMotion || mode === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
