import { addDays, daysBetween, startOfWeek, weekday } from "@/lib/calendar/dates";
import type { CalItem, Occurrence } from "@/lib/calendar/types";

const MAX_STEPS = 4000;

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

// Does the repeat rule put an occurrence on `day`? (`day` is on or after the
// start date.) A monthly item on the 31st skips months that have no 31st, as
// the iCalendar standard does.
function matches(item: CalItem, day: string): boolean {
  const start = item.date as string;
  const r = item.recurrence;
  const gap = daysBetween(start, day);
  switch (r.freq) {
    case "none":
      return day === start;
    case "daily":
      return gap % r.interval === 0;
    case "weekly": {
      const days = r.weekdays.length ? r.weekdays : [weekday(start)];
      if (!days.includes(weekday(day))) return false;
      const weeks = Math.floor(daysBetween(startOfWeek(start, 1), startOfWeek(day, 1)) / 7);
      return weeks % r.interval === 0;
    }
    case "monthly":
      return day.slice(8) === start.slice(8) && monthsBetween(start, day) % r.interval === 0;
    case "yearly":
      return day.slice(5) === start.slice(5) && (Number(day.slice(0, 4)) - Number(start.slice(0, 4))) % r.interval === 0;
  }
}

// Every occurrence of an item that touches [from, to], in date order.
// Multi-day events count as touching every day they cover.
export function occurrencesBetween(item: CalItem, from: string, to: string): Occurrence[] {
  if (!item.date) return [];
  const spanDays = item.endDate && item.endDate > item.date ? daysBetween(item.date, item.endDate) : 0;
  const out: Occurrence[] = [];
  const r = item.recurrence;

  if (r.freq === "none") {
    const end = addDays(item.date, spanDays);
    if (item.date <= to && end >= from && !item.skipDates.includes(item.date)) {
      out.push({ key: `${item.id}@${item.date}`, item, date: item.date, endDate: end, done: item.done });
    }
    return out;
  }

  let produced = 0;
  const lastDay = r.until && r.until < to ? r.until : to;
  // Walk forward from the start so "every 2 weeks" and "10 times" are exact.
  for (let day = item.date, steps = 0; day <= lastDay && steps < MAX_STEPS; day = addDays(day, 1), steps++) {
    if (!matches(item, day)) continue;
    produced++;
    if (r.count !== null && produced > r.count) break;
    const end = addDays(day, spanDays);
    if (end >= from && !item.skipDates.includes(day)) {
      out.push({ key: `${item.id}@${day}`, item, date: day, endDate: end, done: item.doneDates.includes(day) });
    }
  }
  return out;
}

export function allOccurrences(items: CalItem[], from: string, to: string): Occurrence[] {
  return items
    .flatMap((i) => occurrencesBetween(i, from, to))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.item.startTime ?? "").localeCompare(b.item.startTime ?? "") || a.item.title.localeCompare(b.item.title));
}

// A plain-English description of a repeat rule.
export function describeRecurrence(item: Pick<CalItem, "date" | "recurrence">): string {
  const r = item.recurrence;
  if (r.freq === "none") return "";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const every = r.interval === 1 ? "" : ` ${r.interval}`;
  let text: string;
  switch (r.freq) {
    case "daily":
      text = r.interval === 1 ? "Every day" : `Every ${r.interval} days`;
      break;
    case "weekly": {
      const days = r.weekdays.length ? r.weekdays : item.date ? [weekday(item.date)] : [];
      text = `Every${every} week${days.length ? ` on ${days.map((d) => names[d]).join(", ")}` : ""}`;
      break;
    }
    case "monthly":
      text = `Every${every} month${item.date ? ` on day ${Number(item.date.slice(8))}` : ""}`;
      break;
    default:
      text = r.interval === 1 ? "Every year" : `Every ${r.interval} years`;
  }
  if (r.until) text += `, until ${r.until}`;
  else if (r.count) text += `, ${r.count} times`;
  return text;
}
