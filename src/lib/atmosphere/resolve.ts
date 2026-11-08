// LIVE CITY ATMOSPHERE — deciding what to show. Pure functions: the page, the
// visitor's choice, the season and (only when known) the real weather go in;
// a plain description of the scene comes out. Nothing here draws anything.

export type AtmosphereMode = "auto" | "sakura" | "neon" | "autumn" | "fuji" | "matsuri" | "off";
export type Intensity = "low" | "medium" | "off";
export type Art = "sakura" | "neon" | "autumn" | "fuji" | "matsuri";
export type Particle = "petals" | "leaves" | "snow" | "sparkles" | "cityLights";
export type WeatherLayer = "rain" | "snow" | "clouds" | "sun";
export type WeatherKind = "clear" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export interface AtmospherePrefs {
  mode: AtmosphereMode;
  intensity: Intensity;
}

export const DEFAULT_PREFS: AtmospherePrefs = { mode: "auto", intensity: "medium" };

export const MODES: AtmosphereMode[] = ["auto", "sakura", "neon", "autumn", "fuji", "matsuri", "off"];
export const INTENSITIES: Intensity[] = ["low", "medium", "off"];

export function parsePrefs(raw: unknown): AtmospherePrefs {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<AtmospherePrefs>;
  return {
    mode: MODES.includes(v.mode as AtmosphereMode) ? (v.mode as AtmosphereMode) : DEFAULT_PREFS.mode,
    intensity: INTENSITIES.includes(v.intensity as Intensity) ? (v.intensity as Intensity) : DEFAULT_PREFS.intensity,
  };
}

export interface Resolved {
  art: Art | null;
  particle: Particle | null;
  weather: WeatherLayer | null;
  fireworks: boolean;
  // false → a still picture (intensity Off, or the system asks for less motion is handled in CSS).
  animate: boolean;
  // How much the page's own colour is laid over the scene (0–1): more for
  // pages meant for reading.
  veil: number;
  // Particle count scale.
  density: number;
}

const OFF: Resolved = { art: null, particle: null, weather: null, fireworks: false, animate: false, veil: 1, density: 0 };

type RouteKind = "home" | "explore" | "news" | "weather" | "events" | "off";

// Pages that get a background. Emergency, Settings, the map and the sign-in
// pages stay plain on purpose: calm, readable, no motion.
export function routeKind(pathname: string): RouteKind {
  if (pathname === "/") return "home";
  if (pathname === "/explore" || pathname.startsWith("/explore/")) return "explore";
  if (pathname === "/news" || pathname.startsWith("/news/")) return "news";
  if (pathname === "/weather" || pathname.startsWith("/weather/")) return "weather";
  if (pathname === "/events" || pathname.startsWith("/events/")) return "events";
  return "off";
}

export function seasonOfMonth(month: number): "spring" | "summer" | "autumn" | "winter" {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

const SEASON_ART = { spring: "sakura", summer: "matsuri", autumn: "autumn", winter: "fuji" } as const;
const SEASON_PARTICLE = { spring: "petals", summer: "sparkles", autumn: "leaves", winter: "snow" } as const;
const ART_PARTICLE: Record<Art, Particle> = { sakura: "petals", neon: "cityLights", autumn: "leaves", fuji: "snow", matsuri: "sparkles" };

export interface ResolveInput {
  prefs: AtmospherePrefs;
  pathname: string;
  month: number; // 1–12, Japan time
  hour: number; // 0–23, Japan time
  // Real weather for the chosen city, or null when unknown.
  weather: { icon: WeatherKind; isNight: boolean } | null;
}

export function resolveAtmosphere({ prefs, pathname, month, hour, weather }: ResolveInput): Resolved {
  const route = routeKind(pathname);
  if (route === "off" || prefs.mode === "off") return OFF;

  const season = seasonOfMonth(month);
  const auto = prefs.mode === "auto";

  let art: Art;
  let particle: Particle;
  if (auto) {
    art = route === "news" ? "neon" : route === "events" ? "matsuri" : route === "explore" ? "fuji" : SEASON_ART[season];
    particle = route === "news" ? "cityLights" : route === "events" ? "sparkles" : SEASON_PARTICLE[season];
  } else {
    art = prefs.mode as Art;
    particle = ART_PARTICLE[art];
  }

  // The real weather only ever adds to an Auto scene, and only where weather
  // matters; without a reading nothing is shown.
  let layer: WeatherLayer | null = null;
  let particleOut: Particle | null = particle;
  if (auto && weather && (route === "home" || route === "weather" || route === "explore")) {
    const w = weather.icon;
    if (w === "rain" || w === "drizzle" || w === "storm") {
      layer = "rain";
      particleOut = null;
    } else if (w === "snow") {
      // Real snowfall: the snow is the particle layer, replacing petals/leaves.
      layer = "snow";
      particleOut = "snow";
    } else if (w === "cloud" || w === "fog") layer = "clouds";
    else if (!weather.isNight) layer = "sun";
  }

  const reading = route === "news";
  const intensity: Intensity = reading && prefs.intensity === "medium" ? "low" : prefs.intensity;
  const animate = intensity !== "off";
  const night = hour >= 19 || hour < 5;

  return {
    art,
    particle: animate ? particleOut : null,
    weather: animate ? layer : null,
    fireworks: animate && intensity === "medium" && art === "matsuri" && night && !reading,
    animate,
    veil: reading ? 0.74 : route === "weather" ? 0.42 : 0.48,
    density: intensity === "low" ? 0.5 : 1,
  };
}
