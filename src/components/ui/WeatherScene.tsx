"use client";

import { motion } from "motion/react";
import type { WeatherIconKind } from "@/lib/services/weather";

// A small animated "window" reflecting the actual current condition —
// falling rain/snow, drifting clouds, a pulsing sun, twinkling stars at
// night — driven directly by the same real icon kind used elsewhere,
// never a decorative stand-in.

const SKY: Record<WeatherIconKind, { day: string; night: string }> = {
  clear: { day: "from-gold/50 to-azure/40", night: "from-[#141033] to-[#0b0e1a]" },
  partly: { day: "from-azure/35 to-gold/25", night: "from-[#161a3a] to-[#0b0e1a]" },
  cloud: { day: "from-azure/25 to-foreground/10", night: "from-[#161a30] to-[#0b0e1a]" },
  fog: { day: "from-foreground/15 to-foreground/5", night: "from-[#1a1d2b] to-[#0b0e1a]" },
  drizzle: { day: "from-azure/35 to-panel", night: "from-[#101228] to-[#0b0e1a]" },
  rain: { day: "from-azure/45 to-panel", night: "from-[#0e1024] to-[#0b0e1a]" },
  snow: { day: "from-azure/20 to-foreground/10", night: "from-[#181c30] to-[#0b0e1a]" },
  storm: { day: "from-[#2a2440] to-panel", night: "from-[#181430] to-[#0b0e1a]" },
};

function Sun() {
  return (
    <motion.div
      className="absolute right-3 top-3 h-6 w-6 rounded-full bg-gold shadow-[0_0_16px_4px_rgba(242,197,114,0.55)]"
      animate={{ scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function Moon() {
  return (
    <div className="absolute right-3 top-3 h-6 w-6 overflow-hidden rounded-full bg-[#e8e6f0] shadow-[0_0_10px_2px_rgba(232,230,240,0.35)]">
      <div className="absolute -right-1.5 -top-1 h-6 w-6 rounded-full bg-[#141033]" />
    </div>
  );
}

function Stars() {
  const stars = [
    { x: 8, y: 10, delay: 0 },
    { x: 20, y: 26, delay: 0.6 },
    { x: 34, y: 12, delay: 1.1 },
    { x: 12, y: 34, delay: 1.6 },
  ];
  return (
    <>
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute h-[3px] w-[3px] rounded-full bg-foreground/80"
          style={{ left: s.x, top: s.y }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function Cloud({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`absolute h-4 w-9 rounded-full bg-foreground/75 before:absolute before:-left-2 before:-top-1.5 before:h-4 before:w-5 before:rounded-full before:bg-foreground/75 after:absolute after:-right-1.5 after:-top-2 after:h-5 after:w-5 after:rounded-full after:bg-foreground/75 ${className}`}
      animate={{ x: [-3, 3, -3] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function Rain({ count = 5, fast = false }: { count?: number; fast?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute top-6 w-[2px] rounded-full bg-azure/80"
          style={{ left: `${10 + i * (44 / count)}%`, height: fast ? 10 : 7 }}
          animate={{ y: [0, 26], opacity: [0, 1, 0] }}
          transition={{
            duration: fast ? 0.55 : 0.9,
            repeat: Infinity,
            delay: i * (fast ? 0.11 : 0.18),
            ease: "easeIn",
          }}
        />
      ))}
    </>
  );
}

function Snow({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute top-5 h-1 w-1 rounded-full bg-foreground/90"
          style={{ left: `${10 + i * (44 / count)}%` }}
          animate={{ y: [0, 28], x: [0, i % 2 === 0 ? 4 : -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function Lightning() {
  return (
    <motion.div
      className="absolute inset-0 bg-foreground/40"
      animate={{ opacity: [0, 0, 0, 0.5, 0, 0.2, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
    />
  );
}

function Fog() {
  const bands = [10, 24, 38];
  return (
    <>
      {bands.map((y, i) => (
        <motion.span
          key={y}
          className="absolute h-2 w-11 rounded-full bg-foreground/60"
          style={{ left: 3, top: y }}
          animate={{ x: [-4, 4, -4] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

export default function WeatherScene({
  icon,
  isNight = false,
  className = "",
}: {
  icon: WeatherIconKind;
  isNight?: boolean;
  className?: string;
}) {
  const sky = SKY[icon][isNight ? "night" : "day"];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${sky} ${className}`}
      aria-hidden="true"
    >
      {icon === "clear" && (isNight ? <><Moon /><Stars /></> : <Sun />)}

      {icon === "partly" && (
        <>
          {isNight ? <Moon /> : <Sun />}
          <Cloud className="left-2 top-7" />
        </>
      )}

      {icon === "cloud" && (
        <>
          <Cloud className="left-2 top-6" />
          <Cloud className="left-6 top-9 opacity-70" />
        </>
      )}

      {icon === "fog" && <Fog />}

      {icon === "drizzle" && (
        <>
          <Cloud className="left-3 top-4" />
          <Rain count={3} />
        </>
      )}

      {icon === "rain" && (
        <>
          <Cloud className="left-3 top-4" />
          <Rain count={5} fast />
        </>
      )}

      {icon === "snow" && (
        <>
          <Cloud className="left-3 top-4" />
          <Snow count={5} />
        </>
      )}

      {icon === "storm" && (
        <>
          <Cloud className="left-3 top-4" />
          <Rain count={4} fast />
          <Lightning />
        </>
      )}
    </div>
  );
}
