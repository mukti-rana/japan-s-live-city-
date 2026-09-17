"use client";

import { motion } from "motion/react";
import type { WeatherIconKind } from "@/lib/services/weather";

// A small animated "window" reflecting the actual current condition —
// falling rain/snow, drifting clouds, a pulsing sun, twinkling stars at
// night — driven directly by the same real icon kind used elsewhere,
// never a decorative stand-in.
//
// `variant` picks the scale: "compact" (the original small hero-card
// icon, pixel-for-pixel unchanged), "panel" (fills a medium card, e.g.
// the hero's weather stat box), or "backdrop" (large full-bleed page
// background, used by /weather). Tailwind's JIT compiler needs literal
// class strings, so each variant gets its own small style lookup rather
// than concatenating arbitrary values.

type Variant = "compact" | "panel" | "backdrop";

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
  panel: "rounded-xl",
  backdrop: "rounded-3xl",
};

const SUN_STYLES: Record<Variant, string> = {
  compact: "absolute right-3 top-3 h-6 w-6",
  panel: "absolute right-[8%] top-[12%] h-9 w-9 sm:h-11 sm:w-11",
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
  panel: "absolute right-[8%] top-[12%] h-8 w-8 sm:h-10 sm:w-10",
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
  panel: [
    { x: 12, y: 10, delay: 0 },
    { x: 28, y: 22, delay: 0.5 },
    { x: 48, y: 8, delay: 1.0 },
    { x: 65, y: 26, delay: 1.4 },
    { x: 18, y: 40, delay: 0.8 },
    { x: 55, y: 42, delay: 0.2 },
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

const STAR_UNIT: Record<Variant, "px" | "%"> = { compact: "px", panel: "%", backdrop: "%" };
const STAR_SIZE: Record<Variant, string> = {
  compact: "h-[3px] w-[3px]",
  panel: "h-1 w-1",
  backdrop: "h-1 w-1 sm:h-[5px] sm:w-[5px]",
};

function Stars({ variant }: { variant: Variant }) {
  const stars = STAR_SETS[variant];
  const unit = STAR_UNIT[variant];
  const size = STAR_SIZE[variant];
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
  panel:
    "h-5 w-11 before:h-5 before:w-7 before:-left-2.5 before:-top-2 after:h-6 after:w-7 after:-right-2 after:-top-2.5",
  backdrop:
    "h-6 w-16 sm:h-9 sm:w-24 before:h-6 before:w-10 sm:before:h-9 sm:before:w-14 before:-left-3 before:-top-1.5 after:h-7 after:w-10 sm:after:h-10 sm:after:w-14 after:-right-2 after:-top-2",
};

const CLOUD_OPACITY: Record<Variant, string> = {
  compact: "bg-foreground/75 before:bg-foreground/75 after:bg-foreground/75",
  panel: "bg-foreground/45 before:bg-foreground/45 after:bg-foreground/45",
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
  panel: { primary: "left-[10%] top-[18%]", secondary: "left-[42%] top-[32%] opacity-70" },
  backdrop: { primary: "left-[38%] top-[10%]", secondary: "left-[55%] top-[20%] opacity-70" },
};

const RAIN_GEOMETRY: Record<Variant, { fall: number; height: (fast: boolean) => number; top: string }> = {
  compact: { fall: 26, height: (fast) => (fast ? 10 : 7), top: "top-6" },
  panel: { fall: 90, height: (fast) => (fast ? 16 : 11), top: "top-[26%]" },
  backdrop: { fall: 220, height: (fast) => (fast ? 32 : 22), top: "top-[40%]" },
};

function Rain({ count = 5, fast = false, variant }: { count?: number; fast?: boolean; variant: Variant }) {
  const { fall, height, top } = RAIN_GEOMETRY[variant];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className={`absolute w-[2px] rounded-full bg-azure/80 ${top}`}
          style={{ left: `${5 + i * (90 / count)}%`, height: height(fast) }}
          animate={{ y: [0, fall], opacity: [0, 1, 0] }}
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

const SNOW_GEOMETRY: Record<Variant, { fall: number; top: string }> = {
  compact: { fall: 28, top: "top-5" },
  panel: { fall: 85, top: "top-[22%]" },
  backdrop: { fall: 200, top: "top-[35%]" },
};

function Snow({ count = 5, variant }: { count?: number; variant: Variant }) {
  const { fall, top } = SNOW_GEOMETRY[variant];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className={`absolute h-1 w-1 rounded-full bg-foreground/90 ${top}`}
          style={{ left: `${5 + i * (90 / count)}%` }}
          animate={{ y: [0, fall], x: [0, i % 2 === 0 ? 4 : -4, 0] }}
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

const FOG_BANDS: Record<Variant, number[]> = {
  compact: [10, 24, 38],
  panel: [15, 32, 50],
  backdrop: [20, 42, 64, 84],
};
const FOG_SIZE: Record<Variant, string> = {
  compact: "h-2 w-11",
  panel: "h-2.5 w-2/3",
  backdrop: "h-3 w-2/3 sm:h-4",
};
const FOG_UNIT: Record<Variant, "px" | "%"> = { compact: "px", panel: "%", backdrop: "%" };
const FOG_LEFT: Record<Variant, number | string> = { compact: 3, panel: "5%", backdrop: "5%" };

function Fog({ variant }: { variant: Variant }) {
  const bands = FOG_BANDS[variant];
  return (
    <>
      {bands.map((y, i) => (
        <motion.span
          key={y}
          className={`absolute rounded-full bg-foreground/60 ${FOG_SIZE[variant]}`}
          style={{ left: FOG_LEFT[variant], top: `${y}${FOG_UNIT[variant]}` }}
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
  const bigVariant = variant !== "compact";

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
          <Rain variant={variant} count={bigVariant ? (variant === "backdrop" ? 10 : 7) : 3} />
        </>
      )}

      {icon === "rain" && (
        <>
          <Cloud variant={variant} position={pos.primary} />
          <Rain variant={variant} count={bigVariant ? (variant === "backdrop" ? 16 : 11) : 5} fast />
        </>
      )}

      {icon === "snow" && (
        <>
          <Cloud variant={variant} position={pos.primary} />
          <Snow variant={variant} count={bigVariant ? (variant === "backdrop" ? 16 : 11) : 5} />
        </>
      )}

      {icon === "storm" && (
        <>
          <Cloud variant={variant} position={pos.primary} />
          <Rain variant={variant} count={bigVariant ? (variant === "backdrop" ? 14 : 9) : 4} fast />
          <Lightning />
        </>
      )}
    </div>
  );
}
