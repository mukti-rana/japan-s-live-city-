import { addDays, daysBetween, endOfMonth, jstDate, weekday } from "@/lib/events/time";

export { addDays, daysBetween, endOfMonth, jstDate, weekday };

export const monthStart = (date: string) => `${date.slice(0, 8)}01`;

export function addMonths(date: string, n: number): string {
  const [y, m] = date.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  return first.toISOString().slice(0, 8) + "01";
}

// The first day of the week containing `date`.
export function startOfWeek(date: string, weekStartsOn: 0 | 1): string {
  const diff = (weekday(date) - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

export function weekDays(date: string, weekStartsOn: 0 | 1): string[] {
  const start = startOfWeek(date, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// The weeks shown in a month grid (always whole weeks).
export function monthGrid(date: string, weekStartsOn: 0 | 1): string[][] {
  const first = monthStart(date);
  const last = endOfMonth(first);
  const start = startOfWeek(first, weekStartsOn);
  const weeks: string[][] = [];
  for (let d = start; d <= last || weeks.length === 0; d = addDays(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    if (addDays(d, 7) > last) break;
  }
  return weeks;
}

// A Japan wall-clock date and time as a real moment.
export function instant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+09:00`);
}

export function minutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Is a Japan wall-clock time inside quiet hours (which may cross midnight)?
export function inQuietHours(time: string, start: string, end: string): boolean {
  const t = minutesOfDay(time);
  const s = minutesOfDay(start);
  const e = minutesOfDay(end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

export function jstClock(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
}

export function isTime(v: string | null | undefined): v is string {
  return Boolean(v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
}
