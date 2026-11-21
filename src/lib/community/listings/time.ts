// Dates for What's Happening. Japan has no daylight saving, so every moment is stored exactly (UTC) and shown in Japan time (UTC+9).
// Pure functions with no browser or server code, so the pages, the API routes and the tests share them.

// The current moment, behind a function so a page reads the clock once, in one place.
export const nowMs = () => Date.now();

const JST_MS = 9 * 3600 * 1000;
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
// An event with no end time is treated as lasting this long.
export const DEFAULT_DURATION_MS = 4 * HOUR;

export interface TimedListing {
  kind: string;
  startsAt: string | null;
  endsAt: string | null;
  recurrence: string;
  recurrenceUntil: string | null;
}

interface Parts {
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
}

function jstParts(ms: number): Parts {
  const d = new Date(ms + JST_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
}
const fromJst = (p: Parts) => Date.UTC(p.y, p.m, p.d, p.h, p.mi) - JST_MS;

// "2026-12-24" + "18:30" in Japan time → an ISO moment. Returns null for anything that is not a real date and time.
export function jstToIso(date: string, time = "00:00"): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dm || !tm) return null;
  const [y, m, d, h, mi] = [Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2])];
  if (h > 23 || mi > 59) return null;
  const probe = new Date(Date.UTC(y, m, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m || probe.getUTCDate() !== d) return null; // 31 February
  return new Date(Date.UTC(y, m, d, h, mi) - JST_MS).toISOString();
}

// An ISO moment → the date and time as they read in Japan, for form fields.
export function isoToJst(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const p = jstParts(new Date(iso).getTime());
  const two = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.y}-${two(p.m + 1)}-${two(p.d)}`, time: `${two(p.h)}:${two(p.mi)}` };
}

function addMonthsJst(ms: number, n: number): number {
  const p = jstParts(ms);
  const first = new Date(Date.UTC(p.y, p.m + n, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return fromJst({ y: first.getUTCFullYear(), m: first.getUTCMonth(), d: Math.min(p.d, lastDay), h: p.h, mi: p.mi });
}

export interface Occurrence {
  start: number;
  end: number;
  index: number;
}

// The first occurrence that has not finished by `now`, or null when they are all over. A one-off is its own only occurrence.
export function nextOccurrence(l: TimedListing, now: number): Occurrence | null {
  if (!l.startsAt) return null;
  const start0 = new Date(l.startsAt).getTime();
  const end0 = l.endsAt ? new Date(l.endsAt).getTime() : start0 + DEFAULT_DURATION_MS;
  const dur = Math.max(end0 - start0, 0);
  if (l.recurrence === "none") return end0 >= now ? { start: start0, end: end0, index: 0 } : null;

  // The repeats end at the end of the `recurrenceUntil` day in Japan.
  const until = l.recurrenceUntil ? jstToIso(l.recurrenceUntil, "23:59") : null;
  const untilMs = until ? new Date(until).getTime() + 59_999 : Infinity;
  const at = (i: number) => (l.recurrence === "monthly" ? addMonthsJst(start0, i) : start0 + i * (l.recurrence === "weekly" ? 7 * DAY : DAY));
  const step = l.recurrence === "weekly" ? 7 * DAY : DAY;
  let i = l.recurrence === "monthly" ? 0 : Math.max(0, Math.floor((now - dur - start0) / step));
  for (let guard = 0; guard < 400; guard++, i++) {
    const s = at(i);
    if (s > untilMs) return null;
    if (s + dur >= now) return { start: s, end: s + dur, index: i };
  }
  return null;
}

export type Phase = "live" | "upcoming" | "past" | "ongoing";

// Where a listing is in time. Events and activities are live while an occurrence is under way. An announcement or promotion with no
// dates is simply ongoing; with an expiry date it is ongoing until then, and past after it.
export function phaseOf(l: TimedListing, now: number): Phase {
  const isTimed = l.kind === "event" || l.kind === "activity";
  if (isTimed) {
    const occ = nextOccurrence(l, now);
    if (!occ) return "past";
    return occ.start <= now ? "live" : "upcoming";
  }
  if (l.endsAt && new Date(l.endsAt).getTime() < now) return "past";
  if (l.startsAt && new Date(l.startsAt).getTime() > now) return "upcoming";
  return "ongoing";
}

// The moment to show as "when": the current or next occurrence, or the stored start for a one-off that is over.
export function displayStart(l: TimedListing, now: number): number | null {
  if (!l.startsAt) return null;
  return nextOccurrence(l, now)?.start ?? new Date(l.startsAt).getTime();
}

const LOCALES: Record<string, string> = { en: "en-GB", ja: "ja-JP", ne: "ne-NP", hi: "hi-IN", zh: "zh-CN", ko: "ko-KR" };
export const localeFor = (language: string) => LOCALES[language] ?? "en-GB";

function fmt(ms: number, locale: string, o: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Tokyo", ...o }).format(new Date(ms));
}

// "Sat 24 Jul 2027 · 18:00 – 21:00" in the reader's language, always in Japan time.
export function formatWhen(startMs: number, endMs: number | null, allDay: boolean, language: string): string {
  const locale = localeFor(language);
  const day = { weekday: "short", day: "numeric", month: "short", year: "numeric" } as const;
  const time = { hour: "2-digit", minute: "2-digit", hour12: false } as const;
  const sameDay = endMs !== null && isoToJst(new Date(startMs).toISOString()).date === isoToJst(new Date(endMs).toISOString()).date;
  if (allDay) return endMs !== null && !sameDay ? `${fmt(startMs, locale, day)} – ${fmt(endMs, locale, day)}` : fmt(startMs, locale, day);
  if (endMs === null) return `${fmt(startMs, locale, day)} · ${fmt(startMs, locale, time)}`;
  if (sameDay) return `${fmt(startMs, locale, day)} · ${fmt(startMs, locale, time)} – ${fmt(endMs, locale, time)}`;
  return `${fmt(startMs, locale, day)} ${fmt(startMs, locale, time)} – ${fmt(endMs, locale, day)} ${fmt(endMs, locale, time)}`;
}

export function formatDay(ms: number, language: string): string {
  return fmt(ms, localeFor(language), { weekday: "short", day: "numeric", month: "short" });
}

// How long until a start, for a countdown: whole days, hours and minutes.
export function countdown(startMs: number, now: number): { days: number; hours: number; minutes: number } | null {
  const left = startMs - now;
  if (left <= 0) return null;
  return { days: Math.floor(left / DAY), hours: Math.floor((left % DAY) / HOUR), minutes: Math.floor((left % HOUR) / 60000) };
}

// The words for a repeat, for a notice such as "Repeats weekly until 30 Sep".
export const RECURRENCE_LABEL: Record<string, string> = { daily: "Repeats daily", weekly: "Repeats weekly", monthly: "Repeats monthly" };
