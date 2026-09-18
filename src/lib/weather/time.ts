// Real sunrise/sunset (both "HH:mm" JST, as returned by getWeather) compared
// against the current JST clock — shared by every surface that renders an
// animated day/night weather scene, so they all agree on "is it night".
export function isNightNow(sunrise: string, sunset: string): boolean {
  const nowJst = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return nowJst < sunrise || nowJst >= sunset;
}

// 0-1 progress through the current day, clamped, from real sunrise/sunset.
export function dayProgress(sunrise: string, sunset: string): number {
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const nowJst = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  const sunriseMin = toMinutes(sunrise);
  const sunsetMin = toMinutes(sunset);
  const nowMin = toMinutes(nowJst);

  if (sunsetMin <= sunriseMin) return 0.5;
  const progress = (nowMin - sunriseMin) / (sunsetMin - sunriseMin);
  return Math.min(Math.max(progress, 0), 1);
}

export type TimeOfDayPhase = "morning" | "afternoon" | "sunset" | "night";

// Coarse local-JST phase used for subtle ambient-lighting accents — not
// tied to real sunrise/sunset (that's isNightNow's job), just a simple
// clock-hour bucket.
export function timeOfDayPhase(): TimeOfDayPhase {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", hour12: false }).format(
      new Date(),
    ),
  );
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 19) return "sunset";
  return "night";
}

export type Season = "spring" | "summer" | "autumn" | "winter";

// Northern-hemisphere meteorological season from the current JST month —
// used only to decide whether sakura petals are in season for the hero's
// canvas atmosphere.
export function currentSeasonJST(): Season {
  const month = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", month: "2-digit" }).format(new Date()),
  );
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}
