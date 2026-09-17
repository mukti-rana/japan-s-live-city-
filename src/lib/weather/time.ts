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
