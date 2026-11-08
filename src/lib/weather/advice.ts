import type { WeatherSnapshot } from "@/lib/services/weather";

// What to prepare before going out, worked out from the real forecast already
// on the page: the reading now, the next 12 hours of temperature, rain chance
// and expected rainfall, wind and the day's UV peak. Nothing here is invented;
// when a figure isn't available the advice says what it could and couldn't use.
// Strings are English keys, translated where they are shown.

export type WearBand = "freezing" | "cold" | "cool" | "mild" | "comfortable" | "warm" | "hot";
export type UmbrellaLevel = "none" | "umbrella" | "raincoat" | "heavy";
export type SunLevel = "night" | "low" | "moderate" | "high" | "veryHigh";

export interface Advice {
  wear: {
    band: WearBand;
    headline: string;
    items: string[];
    // The temperature the clothing advice is based on.
    feelsLikeC: number;
    cooling: { tempC: number; at: string } | null;
    swing: { low: number; high: number } | null;
  };
  umbrella: {
    level: UmbrellaLevel;
    headline: string;
    peakProb: number;
    from: string | null;
    to: string | null;
    totalMm: number | null;
    windKmh: number;
    windy: boolean;
  };
  sun: { level: SunLevel; headline: string; items: string[]; uv: number; sunrise: string };
}

const WEAR: Record<WearBand, { headline: string; items: string[] }> = {
  freezing: { headline: "Freezing — dress very warmly", items: ["Thermal base layer", "Winter coat", "Warm sweater", "Scarf and gloves"] },
  cold: { headline: "Cold — wear a winter coat", items: ["Winter coat", "Warm sweater", "Scarf"] },
  cool: { headline: "Cool — wear a coat or jacket", items: ["Coat or warm jacket", "Sweater or long sleeves"] },
  mild: { headline: "Mild — a light jacket is enough", items: ["Light jacket or cardigan", "Long sleeves"] },
  comfortable: { headline: "Comfortable — light layers", items: ["Long or short sleeves", "A light layer for later"] },
  warm: { headline: "Warm — wear light clothing", items: ["T-shirt or light shirt", "Breathable fabrics"] },
  hot: { headline: "Hot — wear the lightest clothing", items: ["Light, breathable clothing", "Drink water often"] },
};

function bandFor(feels: number): WearBand {
  if (feels <= 0) return "freezing";
  if (feels <= 7) return "cold";
  if (feels <= 13) return "cool";
  if (feels <= 18) return "mild";
  if (feels <= 24) return "comfortable";
  if (feels <= 29) return "warm";
  return "hot";
}

const hhmm = (time: string) => time.slice(11, 16);

export function buildAdvice(w: WeatherSnapshot, isNight: boolean): Advice {
  const window = w.hourly.slice(0, 12);

  // ── What to wear ───────────────────────────────────────────────────────
  const band = bandFor(w.feelsLikeC);
  const items = [...WEAR[band].items];
  if (w.windKmh >= 30 && band !== "hot" && band !== "warm") items.push("Windproof outer layer");
  const minAhead = window.reduce<{ tempC: number; at: string } | null>((m, h) => (m === null || h.tempC < m.tempC ? { tempC: h.tempC, at: hhmm(h.time) } : m), null);
  // Cooler later in the day than it feels now: say so, with the real numbers.
  const cooling = minAhead && minAhead.tempC <= w.feelsLikeC - 4 && band !== "freezing" ? minAhead : null;
  const swing = !cooling && w.todayHigh - w.todayLow >= 9 ? { low: w.todayLow, high: w.todayHigh } : null;

  // ── Umbrella: probability AND expected rainfall over the next 12 hours ──
  const probs = window.map((h) => h.precipProbability);
  const peakProb = probs.length ? Math.max(...probs) : w.todayPrecipProbability;
  const mm = window.map((h) => h.precipMm).filter((v): v is number => v !== null);
  const totalMm = mm.length ? Math.round(mm.reduce((a, b) => a + b, 0) * 10) / 10 : null;
  const maxHourMm = mm.length ? Math.max(...mm) : 0;
  const wet = window.filter((h) => h.precipProbability >= 40 || (h.precipMm ?? 0) >= 0.5);
  const stormy = window.some((h) => h.icon === "storm");
  let level: UmbrellaLevel = "none";
  if (stormy || maxHourMm >= 7.6 || (totalMm ?? 0) >= 25) level = "heavy";
  else if (maxHourMm >= 2.5 || (totalMm ?? 0) >= 10) level = "raincoat";
  else if (wet.length > 0 && (peakProb >= 50 || (totalMm ?? 0) >= 0.5)) level = "umbrella";
  const windy = w.windKmh >= 30;
  // A strong wind makes an umbrella unreliable, so step up to a raincoat.
  if (level === "umbrella" && windy) level = "raincoat";
  const UMBRELLA_HEAD: Record<UmbrellaLevel, string> = {
    none: "Umbrella not needed",
    umbrella: "Umbrella recommended",
    raincoat: "Raincoat recommended",
    heavy: "Heavy rain protection recommended",
  };

  // ── Sun, from the day's real UV peak ───────────────────────────────────
  const uv = w.todayUvIndex;
  let sunLevel: SunLevel = "low";
  if (isNight) sunLevel = "night";
  else if (uv >= 8) sunLevel = "veryHigh";
  else if (uv >= 6) sunLevel = "high";
  else if (uv >= 3) sunLevel = "moderate";
  const SUN: Record<SunLevel, { headline: string; items: string[] }> = {
    night: { headline: "No sun protection needed now", items: [] },
    low: { headline: "No sun protection needed", items: [] },
    moderate: { headline: "Sunglasses, and sunscreen if out for long", items: ["Sunglasses", "Sunscreen"] },
    high: { headline: "Sunscreen, sunglasses and a hat", items: ["Sunscreen SPF 30+", "Sunglasses", "Hat"] },
    veryHigh: { headline: "Strong sun — SPF 50+, hat, sunglasses and shade", items: ["Sunscreen SPF 50+", "Sunglasses", "Hat", "Shade at midday"] },
  };

  return {
    wear: { band, headline: WEAR[band].headline, items, feelsLikeC: w.feelsLikeC, cooling, swing },
    umbrella: {
      level,
      headline: UMBRELLA_HEAD[level],
      peakProb,
      from: wet.length ? hhmm(wet[0].time) : null,
      to: wet.length ? hhmm(wet[wet.length - 1].time) : null,
      totalMm,
      windKmh: w.windKmh,
      windy,
    },
    sun: { level: sunLevel, headline: SUN[sunLevel].headline, items: SUN[sunLevel].items, uv, sunrise: w.sunrise },
  };
}
