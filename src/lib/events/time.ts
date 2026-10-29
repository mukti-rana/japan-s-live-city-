// All event dates are calendar dates in Japan ("YYYY-MM-DD"), and "today" is
// always Japan's today — not the server's or the visitor's — so an event is
// never shown as "tomorrow" or "ended" a few hours early or late.

const JST = "Asia/Tokyo";
const FMT = new Intl.DateTimeFormat("en-CA", { timeZone: JST, year: "numeric", month: "2-digit", day: "2-digit" });
const CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: JST, hour: "2-digit", minute: "2-digit", hour12: false });

export function jstDate(now: Date = new Date()): string {
  return FMT.format(now);
}

export function jstMinutes(now: Date = new Date()): number {
  const [h, m] = CLOCK.format(now).split(":").map(Number);
  return h * 60 + m;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 0 = Sunday … 6 = Saturday
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

// The coming weekend (Saturday–Sunday), or the current one if it is already
// Saturday or Sunday.
export function weekendRange(today: string): { start: string; end: string } {
  const dow = weekday(today);
  if (dow === 6) return { start: today, end: addDays(today, 1) };
  if (dow === 0) return { start: addDays(today, -1), end: today };
  const start = addDays(today, 6 - dow);
  return { start, end: addDays(start, 1) };
}

export function endOfMonth(today: string): string {
  const [y, m] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);
}

export function isDate(value: string | undefined | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()));
}
