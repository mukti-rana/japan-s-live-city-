// The calendar's data model. Everything is stored on the visitor's device;
// dates are calendar dates in Japan ("YYYY-MM-DD") and times are Japan
// wall-clock times ("HH:MM"). Nothing here is sent to a server.

export type ItemKind = "event" | "task";

export type Category =
  | "appointment"
  | "work"
  | "class"
  | "assignment"
  | "shopping"
  | "bill"
  | "health"
  | "goal"
  | "habit"
  | "travel"
  | "other";

export const CATEGORIES: Category[] = ["appointment", "work", "class", "assignment", "shopping", "bill", "health", "goal", "habit", "travel", "other"];

export type Freq = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Recurrence {
  freq: Freq;
  interval: number;
  // Weekly only: 0 = Sunday … 6 = Saturday. Empty means the start date's weekday.
  weekdays: number[];
  // Last date a repeat may fall on, or null.
  until: string | null;
  // Total number of occurrences, or null.
  count: number | null;
}

export const NO_REPEAT: Recurrence = { freq: "none", interval: 1, weekdays: [], until: null, count: null };

export interface LinkedEvent {
  id: string;
  title: string;
  url: string | null;
  sourceName: string;
  prefectureId: string | null;
  lat: number | null;
  lon: number | null;
  // The date came from a "usual schedule", not from an organizer.
  estimated: boolean;
}

export interface Departure {
  // Where the trip starts, in the visitor's own words.
  origin: string;
  // Their own estimate of the trip, in minutes.
  travelMinutes: number;
  bufferMinutes: number;
}

export interface CalItem {
  id: string;
  kind: ItemKind;
  title: string;
  category: Category;
  // Start date. For a task this is the due date and may be empty.
  date: string | null;
  // Last day of a multi-day event (same as date when one day).
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  location: string;
  notes: string;
  recurrence: Recurrence;
  // Minutes before the start (events) or before 09:00 on the due date (tasks).
  reminders: number[];
  // Completion of a one-off item.
  done: boolean;
  // Dates on which a repeating item was completed / is skipped.
  doneDates: string[];
  skipDates: string[];
  // Whether the plan is outdoors (turns on the rain notice).
  outdoor: boolean;
  // Prefecture used to look up the forecast, when the visitor chose one.
  prefectureId: string | null;
  linkedEvent: LinkedEvent | null;
  departure: Departure | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  // In-app reminders are always on; this controls browser notifications.
  browserNotifications: boolean;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
  // Default reminder for new items, in minutes (null = none).
  defaultReminder: number | null;
  weekStartsOn: 0 | 1;
}

export const DEFAULT_SETTINGS: Settings = {
  browserNotifications: false,
  quietHours: true,
  quietStart: "22:00",
  quietEnd: "07:00",
  defaultReminder: 30,
  weekStartsOn: 1,
};

export interface CalendarData {
  v: 1;
  items: CalItem[];
  settings: Settings;
  // Reminders already shown, so none is shown twice: "<item>@<date>#<minutes>" → time shown.
  fired: Record<string, number>;
}

export interface Occurrence {
  key: string;
  item: CalItem;
  // The day this occurrence starts on, and (for multi-day events) ends on.
  date: string;
  endDate: string;
  done: boolean;
}
