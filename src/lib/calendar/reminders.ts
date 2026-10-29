import { addDays, inQuietHours, instant, jstClock } from "@/lib/calendar/dates";
import { occurrencesBetween } from "@/lib/calendar/recurrence";
import type { CalItem, CalendarData } from "@/lib/calendar/types";

// Tasks with a due date but no time are reminded relative to 09:00 that day.
const TASK_BASE_TIME = "09:00";
// A reminder that is more than this late is shown as "earlier", not as an alert.
const FRESH_MS = 6 * 3600_000;

export interface DueReminder {
  id: string;
  item: CalItem;
  date: string;
  minutesBefore: number;
  // The moment the reminder was due.
  at: number;
  // When the thing itself starts.
  startsAt: number;
}

export function reminderId(itemId: string, date: string, minutes: number): string {
  return `${itemId}@${date}#${minutes}`;
}

function baseTime(item: CalItem): string | null {
  if (item.startTime && !item.allDay) return item.startTime;
  if (item.kind === "task" || item.allDay) return TASK_BASE_TIME;
  return null;
}

// Every reminder that has come due, was not already shown, and isn't done.
// `fresh` ones are recent enough to alert about; `earlier` ones are listed.
export function dueReminders(data: CalendarData, now: Date = new Date()): { fresh: DueReminder[]; earlier: DueReminder[] } {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(now);
  const from = addDays(today, -2);
  const to = addDays(today, 2);
  const fresh: DueReminder[] = [];
  const earlier: DueReminder[] = [];

  for (const item of data.items) {
    if (item.reminders.length === 0) continue;
    const time = baseTime(item);
    if (!time) continue;
    for (const occ of occurrencesBetween(item, from, to)) {
      if (occ.done) continue;
      const startsAt = instant(occ.date, time).getTime();
      for (const minutes of item.reminders) {
        const at = startsAt - minutes * 60_000;
        const id = reminderId(item.id, occ.date, minutes);
        if (at > now.getTime() || data.fired[id]) continue;
        // Nothing to remind about once the thing is well over.
        if (startsAt < now.getTime() - 6 * 3600_000) continue;
        (now.getTime() - at <= FRESH_MS ? fresh : earlier).push({ id, item, date: occ.date, minutesBefore: minutes, at, startsAt });
      }
    }
  }
  return { fresh, earlier };
}

// Reminders are held back during the visitor's quiet hours and shown as soon
// as they end (as long as the thing is still ahead or just begun).
export function isQuietNow(data: CalendarData, now: Date = new Date()): boolean {
  const s = data.settings;
  return s.quietHours && inQuietHours(jstClock(now), s.quietStart, s.quietEnd);
}

export function reminderLabel(minutes: number): string {
  if (minutes === 0) return "At the time";
  if (minutes < 60) return `${minutes} min before`;
  if (minutes < 1440) return `${minutes / 60} h before`;
  return `${minutes / 1440} day${minutes === 1440 ? "" : "s"} before`;
}

// The time to leave, from the visitor's own travel estimate and buffer.
export function leaveBy(item: CalItem, date: string): { leaveAt: Date; arriveBy: Date } | null {
  if (!item.departure || !item.startTime || item.allDay) return null;
  const arriveBy = instant(date, item.startTime);
  const total = item.departure.travelMinutes + item.departure.bufferMinutes;
  return { leaveAt: new Date(arriveBy.getTime() - total * 60_000), arriveBy };
}
