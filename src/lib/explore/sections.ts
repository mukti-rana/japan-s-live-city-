import { queryCatalogue } from "@/lib/explore/catalogue";
import { CATEGORIES, GROUPS, seasonOfMonth, type CategoryId } from "@/lib/explore/categories";
import { REGIONS } from "@/lib/explore/regions";
import type { Destination } from "@/lib/explore/types";
import type { LanguageCode } from "@/lib/i18n/languages";

export type Scope = "near" | "pref" | "all";
export type WeatherKind = "rain" | "clear" | "cloud" | "snow";

export interface SectionsInput {
  scope: Scope;
  lat: number | null;
  lon: number | null;
  // How precise the position is, in km; only a precise position gets the
  // "within 5 km" groups.
  accuracyKm: number | null;
  prefectureId: string | null;
  weather: WeatherKind | null;
  tempC: number | null;
  language: LanguageCode;
}

export interface Section {
  id: string;
  // A short code the interface turns into an explanation ("because it's raining").
  reason?: string;
  items: Destination[];
}

const JST = "Asia/Tokyo";

function jstNow(): { month: number; hour: number; weekend: boolean } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: JST, month: "numeric", hour: "numeric", hour12: false, weekday: "short" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  return { month: Number(get("month")), hour: Number(get("hour")) % 24, weekend: weekday === "Sat" || weekday === "Sun" };
}

const IN_RAIN: CategoryId[] = ["museum", "aquarium", "market", "onsen"];
const IN_SUN: CategoryId[] = ["park", "mountain", "viewpoint", "beach", "island", "lake", "waterfall", "gorge"];
const IN_EVENING: CategoryId[] = ["viewpoint", "onsen", "market"];
const IN_COLD: CategoryId[] = ["onsen", "ski", "museum", "aquarium"];

export function buildSections(input: SectionsInput): Section[] {
  const { scope, lat, lon, prefectureId, language } = input;
  const now = jstNow();
  const season = seasonOfMonth(now.month);
  const hasPos = lat !== null && lon !== null;
  const near = scope === "near" && hasPos;
  const pos = near ? { lat: lat as number, lon: lon as number } : {};
  const where = scope === "pref" && prefectureId ? { pref: prefectureId } : {};
  const run = (q: Parameters<typeof queryCatalogue>[0], limit = 8) => queryCatalogue({ ...where, ...pos, ...q, limit }, language).items;
  const sections: Section[] = [];
  const push = (id: string, items: Destination[], reason?: string) => {
    if (items.length > 0) sections.push({ id, items, reason });
  };

  // What can I do today? Chosen from the weather, the time and the day, and
  // never claims a place is open — opening hours aren't in the data.
  const radius = near ? 40 : undefined;
  let todayCats: CategoryId[] | null = null;
  let reason = "default";
  if (input.weather === "rain") {
    todayCats = IN_RAIN;
    reason = "rain";
  } else if (input.weather === "snow" || (input.tempC !== null && input.tempC <= 3)) {
    todayCats = IN_COLD;
    reason = "cold";
  } else if (now.hour >= 17 || now.hour < 4) {
    todayCats = IN_EVENING;
    reason = "evening";
  } else if (input.weather === "clear" || input.weather === "cloud") {
    todayCats = IN_SUN;
    reason = input.weather === "clear" ? "sunny" : "cloudy";
  }
  push("today", run({ cats: todayCats ?? undefined, radius, sort: near ? "recommended" : "popular" }, 8), reason);

  if (near) {
    const precise = input.accuracyKm !== null && input.accuracyKm <= 3;
    if (precise) {
      push("within5", run({ radius: 5, sort: "nearest" }));
      push("within10", run({ radius: 10, minRadius: 5, sort: "nearest" }));
    }
    push("popularNear", run({ radius: 40, sort: "popular" }));
    push("hiddenNear", run({ radius: 60, hidden: true, sort: "recommended" }));
  } else if (scope === "pref" && prefectureId) {
    push("popularPref", run({ sort: "popular" }));
    push("hiddenPref", run({ hidden: true, sort: "recommended" }));
  } else {
    push("popularAll", run({ sort: "popular" }));
    push("hiddenAll", run({ hidden: true, photo: true, sort: "popular" }));
  }

  // Things to do, one row per kind of activity (only those that have places).
  for (const g of GROUPS) {
    push(`group:${g.id}`, run({ group: g.id, radius: near ? 50 : undefined, sort: near ? "recommended" : "popular" }, 6));
  }

  if (near) {
    push("weekend", run({ minRadius: 40, radius: 150, sort: "recommended" }), now.weekend ? "weekend" : undefined);
    push("oneday", run({ minRadius: 15, radius: 80, sort: "recommended" }));
  }

  const seasonal = CATEGORIES.filter((c) => c.seasons.length < 4 && c.seasons.includes(season)).map((c) => c.id);
  push("seasonal", run({ cats: seasonal, radius: near ? 80 : undefined, sort: near ? "recommended" : "popular" }), season);

  if (scope === "all") {
    const spotlight: Destination[] = [];
    for (const region of REGIONS) {
      const top = queryCatalogue({ region: region.id, sort: "popular", limit: 1, photo: true }, language).items[0];
      if (top) spotlight.push(top);
    }
    push("regions", spotlight);
  }
  return sections;
}
