"use client";

import { motion } from "motion/react";
import type { WeatherIconKind } from "@/lib/services/weather";

// A small animated "window" reflecting the actual current condition —
// falling rain/snow, drifting clouds, a pulsing sun, twinkling stars at
// night — driven directly by the same real icon kind used elsewhere,
// never a decorative stand-in.
//
// `variant` picks between the original small hero-card box ("compact",
// the default — pixel-for-pixel unchanged) and a large full-bleed page
// background ("backdrop", used by the /weather page). Tailwind's JIT
// compiler needs literal class strings, so each variant gets its own
// small style lookup rather than concatenating arbitrary values.

type Variant = "compact" | "backdrop";

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

const ROOT_RADIUS: Record<Variant, string> = {
  compact: "rounded-2xl",
  backdrop: "rounded-3xl",
};

const SUN_STYLES: Record<Variant, string> = {
  compact: "absolute right-3 top-3 h-6 w-6",
  backdrop: "absolute right-[10%] top-[12%] h-16 w-16 sm:h-24 sm:w-24",
};

function Sun({ variant }: { variant: Variant }) {
  return (
    <motion.div
      className={`rounded-full bg-gold shadow-[0_0_16px_4px_rgba(242,197,114,0.55)] ${SUN_STYLES[variant]}`}
      animate={{ scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

const MOON_STYLES: Record<Variant, string> = {
  compact: "absolute right-3 top-3 h-6 w-6",
  backdrop: "absolute right-[10%] top-[12%] h-14 w-14 sm:h-20 sm:w-20",
};

function Moon({ variant }: { variant: Variant }) {
  return (
    <div
      className={`overflow-hidden rounded-full bg-[#e8e6f0] shadow-[0_0_10px_2px_rgba(232,230,240,0.35)] ${MOON_STYLES[variant]}`}
    >
      <div className="absolute -right-[18%] -top-[12%] h-full w-full rounded-full bg-[#141033]" />
    </div>
  );
}

const STAR_SETS: Record<Variant, { x: number; y: number; delay: number }[]> = {
  compact: [
    { x: 8, y: 10, delay: 0 },
    { x: 20, y: 26, delay: 0.6 },
    { x: 34, y: 12, delay: 1.1 },
    { x: 12, y: 34, delay: 1.6 },
  ],
  backdrop: [
    { x: 10, y: 8, delay: 0 },
    { x: 24, y: 20, delay: 0.4 },
    { x: 40, y: 6, delay: 0.9 },
    { x: 55, y: 24, delay: 1.3 },
    { x: 70, y: 10, delay: 0.2 },
    { x: 80, y: 30, delay: 1.7 },
    { x: 15, y: 40, delay: 1.0 },
    { x: 60, y: 42, delay: 0.7 },
    { x: 88, y: 15, delay: 1.5 },
  ],
};

function Stars({ variant }: { variant: Variant }) {
  const stars = STAR_SETS[variant];
  const unit = variant === "backdrop" ? "%" : "px";
  const size = variant === "backdrop" ? "h-1 w-1 sm:h-[5px] sm:w-[5px]" : "h-[3px] w-[3px]";
  return (
    <>
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className={`absolute rounded-full bg-foreground/80 ${size}`}
          style={{ left: `${s.x}${unit}`, top: `${s.y}${unit}` }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

const CLOUD_SIZE: Record<Variant, string> = {
  compact:
    "h-4 w-9 before:h-4 before:w-5 before:-left-2 before:-top-1.5 after:h-5 after:w-5 after:-right-1.5 after:-top-2",
  backdrop:
    "h-6 w-16 sm:h-9 sm:w-24 before:h-6 before:w-10 sm:before:h-9 sm:before:w-14 before:-left-3 before:-top-1.5 after:h-7 after:w-10 sm:after:h-10 sm:after:w-14 after:-right-2 after:-top-2",
};

const CLOUD_OPACITY: Record<Variant, string> = {
  compact: "bg-foreground/75 before:bg-foreground/75 after:bg-foreground/75",
  backdrop: "bg-foreground/35 before:bg-foreground/35 after:bg-foreground/35",
};

function Cloud({ variant, position }: { variant: Variant; position: string }) {
  return (
    <motion.div
      className={`absolute rounded-full before:absolute before:rounded-full after:absolute after:rounded-full ${CLOUD_OPACITY[variant]} ${CLOUD_SIZE[variant]} ${position}`}
      animate={{ x: [-3, 3, -3] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

const CLOUD_POSITIONS: Record<Variant, Record<"primary" | "secondary", string>> = {
  compact: { primary: "left-2 top-7", secondary: "left-6 top-9 opacity-70" },
  backdrop: { primary: "left-[38%] top-[10%]", secondary: "left-[55%] top-[20%] opacity-70" },
};

function Rain({ count = 5, fast = false, variant }: { count?: number; fast?: boolean; variant: Variant }) {
  const fallDistance = variant === "backdrop" ? 220 : 26;
  const dropHeight = variant === "backdrop" ? (fast ? 32 : 22) : fast ? 10 : 7;
  const top = variant === "backdrop" ? "top-[40%]" : "top-6";
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className={`absolute w-[2px] rounded-full bg-azure/80 ${top}`}
          style={{ left: `${5 + i * (90 / count)}%`, height: dropHeight }}
          animate={{ y: [0, fallDistance], opacity: [0, 1, 0] }}
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

function Snow({ count = 5, variant }: { count?: number; variant: Variant }) {
  const fallDistance = variant === "backdrop" ? 200 : 28;
  const top = variant === "backdrop" ? "top-[35%]" : "top-5";
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className={`absolute h-1 w-1 rounded-full bg-foreground/90 ${top}`}
          style={{ left: `${5 + i * (90 / count)}%` }}
          animate={{ y: [0, fallDistance], x: [0, i % 2 === 0 ? 4 : -4, 0] }}
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

function Fog({ variant }: { variant: Variant }) {
  const bands =
    variant === "backdrop"
      ? [{ y: 20 }, { y: 42 }, { y: 64 }, { y: 84 }]
      : [{ y: 10 }, { y: 24 }, { y: 38 }];
  const size = variant === "backdrop" ? "h-3 w-2/3 sm:h-4" : "h-2 w-11";
  const unit = variant === "backdrop" ? "%" : "px";
  return (
    <>
      {bands.map((b, i) => (
        <motion.span
          key={b.y}
          className={`absolute rounded-full bg-foreground/60 ${size}`}
          style={{ left: variant === "backdrop" ? "5%" : 3, top: `${b.y}${unit}` }}
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
  variant = "compact",
  className = "",
}: {
  icon: WeatherIconKind;
  isNight?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const sky = SKY[icon][isNight ? "night" : "day"];
  const pos = CLOUD_POSITIONS[variant];

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${sky} ${ROOT_RADIUS[variant]} ${className}`}
      aria-hidden="true"
    >
      {icon === "clear" &&
        (isNight ? (
          <>
            <Moon variant={variant} />
            <Stars variant={variant} />
          </>
        ) : (
          <Sun variant={variant} />
        ))}

      {icon === "partly" && (
        <>
          {isNight ? <Moon variant={variant} /> : <Sun variant={variant} />}
          <Cloud variant={variant} position={pos.primary} />
        </>
      )}

      {icon === "cloud" && (
        <>
          <Cloud variant={variant} position={pos.primary} />
          <Cloud variant={variant} position={pos.secondary} />
        </>
      )}

      {icon === "fog" && <Fog variant={variant} />}

      {icon === "drizzle" && (
        <>
          <Cloud variant={variant} position={pos.primary} />
          <Rain variant={variant} count={variant === "backdrop" ? 10 : 3} />
        </>
      )}

      {icon === "rain" && (
        <>
          <Cloud variant={variant} position={pos.primary} />
          <Rain variant={variant} count={variant === "backdrop" ? 16 : 5} fast />
        </>
      )}

      {icon === "snow" && (
        <>
          <Cloud variant={variant} position={pos.primary} />
          <Snow variant={variant} count={variant === "backdrop" ? 16 : 5} />
        </>
      )}

      {icon === "storm" && (
        <>
          <Cloud variant={variant} position={pos.primary} />
          <Rain variant={variant} count={variant === "backdrop" ? 14 : 4} fast />
          <Lightning />
        </>
      )}
    </div>
  );
}
