"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { isTime } from "@/lib/calendar/dates";
import { CATEGORIES, DEFAULT_SETTINGS, NO_REPEAT, type CalItem, type CalendarData, type Category, type Recurrence, type Settings } from "@/lib/calendar/types";
import type { ImportedItem } from "@/lib/calendar/ics";
import type { EventView } from "@/lib/events/query";
import { isDate } from "@/lib/events/time";

// The calendar lives in this browser's local storage. It is never uploaded:
// no account is needed and nothing is shared with any service. Clearing the
// browser's site data removes it (the page says so, and offers an .ics export).

const KEY = "livecity:calendar:v1";
const EVENT = "livecity:calendar";
const MAX_ITEMS = 2000;

const EMPTY: CalendarData = { v: 1, items: [], settings: DEFAULT_SETTINGS, fired: {} };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const strArr = (v: unknown, max: number, each: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max).map((x) => x.slice(0, each)) : []);

function cleanRecurrence(v: unknown): Recurrence {
  const r = (v ?? {}) as Partial<Recurrence>;
  const freq = r.freq === "daily" || r.freq === "weekly" || r.freq === "monthly" || r.freq === "yearly" ? r.freq : "none";
  return {
    freq,
    interval: Math.min(99, Math.max(1, Math.floor(Number(r.interval) || 1))),
    weekdays: Array.isArray(r.weekdays) ? [...new Set(r.weekdays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [],
    until: isDate(r.until ?? undefined) ? (r.until as string) : null,
    count: Number.isInteger(r.count) && (r.count as number) > 0 ? Math.min(1000, r.count as number) : null,
  };
}

function cleanItem(raw: unknown): CalItem | null {
  if (!raw || typeof raw !== "object") return null;
  const i = raw as Record<string, unknown>;
  const id = str(i.id, 80);
  const title = str(i.title, 200).trim();
  if (!id || !title) return null;
  const kind = i.kind === "task" ? "task" : "event";
  const date = isDate(i.date as string) ? (i.date as string) : null;
  const linked = i.linkedEvent && typeof i.linkedEvent === "object" ? (i.linkedEvent as Record<string, unknown>) : null;
  const dep = i.departure && typeof i.departure === "object" ? (i.departure as Record<string, unknown>) : null;
  return {
    id,
    kind,
    title,
    category: CATEGORIES.includes(i.category as Category) ? (i.category as Category) : "other",
    date,
    endDate: isDate(i.endDate as string) && date && (i.endDate as string) >= date ? (i.endDate as string) : null,
    allDay: Boolean(i.allDay),
    startTime: isTime(i.startTime as string) ? (i.startTime as string) : null,
    endTime: isTime(i.endTime as string) ? (i.endTime as string) : null,
    location: str(i.location, 200),
    notes: str(i.notes, 2000),
    recurrence: cleanRecurrence(i.recurrence),
    reminders: Array.isArray(i.reminders) ? i.reminders.filter((m): m is number => Number.isInteger(m) && m >= 0 && m <= 60 * 24 * 30).slice(0, 5) : [],
    done: Boolean(i.done),
    doneDates: strArr(i.doneDates, 800, 10),
    skipDates: strArr(i.skipDates, 800, 10),
    outdoor: Boolean(i.outdoor),
    prefectureId: str(i.prefectureId, 30) || null,
    linkedEvent: linked
      ? {
          id: str(linked.id, 80),
          title: str(linked.title, 200),
          url: typeof linked.url === "string" && /^https?:\/\//.test(linked.url) ? linked.url.slice(0, 500) : null,
          sourceName: str(linked.sourceName, 100),
          prefectureId: str(linked.prefectureId, 30) || null,
          lat: Number.isFinite(linked.lat) ? (linked.lat as number) : null,
          lon: Number.isFinite(linked.lon) ? (linked.lon as number) : null,
          estimated: Boolean(linked.estimated),
        }
      : null,
    departure: dep
      ? {
          origin: str(dep.origin, 200),
          travelMinutes: Math.min(600, Math.max(0, Math.floor(Number(dep.travelMinutes) || 0))),
          bufferMinutes: Math.min(240, Math.max(0, Math.floor(Number(dep.bufferMinutes) || 0))),
        }
      : null,
    createdAt: str(i.createdAt, 40),
    updatedAt: str(i.updatedAt, 40),
  };
}

function parse(raw: string): CalendarData {
  if (!raw) return EMPTY;
  try {
    const p = JSON.parse(raw) as Partial<CalendarData>;
    const s = (p.settings ?? {}) as Partial<Settings>;
    return {
      v: 1,
      items: Array.isArray(p.items) ? p.items.slice(0, MAX_ITEMS).map(cleanItem).filter((x): x is CalItem => x !== null) : [],
      settings: {
        browserNotifications: Boolean(s.browserNotifications),
        quietHours: s.quietHours !== false,
        quietStart: isTime(s.quietStart) ? s.quietStart : DEFAULT_SETTINGS.quietStart,
        quietEnd: isTime(s.quietEnd) ? s.quietEnd : DEFAULT_SETTINGS.quietEnd,
        defaultReminder: s.defaultReminder === null ? null : Number.isInteger(s.defaultReminder) ? (s.defaultReminder as number) : DEFAULT_SETTINGS.defaultReminder,
        weekStartsOn: s.weekStartsOn === 0 ? 0 : 1,
      },
      fired: p.fired && typeof p.fired === "object" ? Object.fromEntries(Object.entries(p.fired).filter(([, v]) => Number.isFinite(v)).slice(-1500)) : {},
    };
  } catch {
    return EMPTY;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function snapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

// Writes are applied to what is in storage *now*, so two quick changes (or two
// tabs) can't overwrite each other.
function mutate(fn: (data: CalendarData) => CalendarData): boolean {
  const next = fn(parse(snapshot()));
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(EVENT));
  return true;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function blankItem(partial: Partial<CalItem> = {}): CalItem {
  const now = new Date().toISOString();
  return {
    id: newId(),
    kind: "event",
    title: "",
    category: "other",
    date: null,
    endDate: null,
    allDay: false,
    startTime: null,
    endTime: null,
    location: "",
    notes: "",
    recurrence: { ...NO_REPEAT },
    reminders: [],
    done: false,
    doneDates: [],
    skipDates: [],
    outdoor: false,
    prefectureId: null,
    linkedEvent: null,
    departure: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

const OUTDOOR_KINDS = new Set(["festival", "fireworks", "sports", "food"]);

// A public event turned into a calendar item, in one step. Nothing about the
// event is changed — the title, dates, venue and link are exactly the source's.
export function itemFromEvent(event: EventView, defaultReminder: number | null): CalItem {
  const noTime = !event.startTime;
  return blankItem({
    kind: "event",
    title: event.title,
    category: "other",
    date: event.current.start,
    endDate: event.current.end > event.current.start ? event.current.end : null,
    allDay: noTime,
    startTime: event.startTime,
    endTime: event.endTime,
    location: [event.venue, event.address ?? event.city].filter(Boolean).join(", "),
    notes: event.typicalDates
      ? "This date is the festival's usual schedule, not an organizer's confirmation. Check the official announcement before you go."
      : "",
    reminders: defaultReminder === null ? [] : [defaultReminder],
    outdoor: OUTDOOR_KINDS.has(event.kind),
    prefectureId: event.prefectureId,
    linkedEvent: {
      id: event.id,
      title: event.title,
      url: event.url,
      sourceName: event.source.name,
      prefectureId: event.prefectureId,
      lat: event.lat,
      lon: event.lon,
      estimated: event.typicalDates,
    },
  });
}

export function useCalendar() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const data = useMemo(() => parse(raw), [raw]);

  const save = useCallback((item: CalItem) => {
    const stamped = { ...item, updatedAt: new Date().toISOString() };
    return mutate((d) => {
      const exists = d.items.some((x) => x.id === item.id);
      return { ...d, items: exists ? d.items.map((x) => (x.id === item.id ? stamped : x)) : [stamped, ...d.items].slice(0, MAX_ITEMS) };
    });
  }, []);

  const remove = useCallback((id: string) => mutate((d) => ({ ...d, items: d.items.filter((x) => x.id !== id) })), []);

  const duplicate = useCallback((id: string) => {
    const copy = parse(snapshot()).items.find((x) => x.id === id);
    if (!copy) return null;
    const twin = { ...copy, id: newId(), title: `${copy.title} (copy)`.slice(0, 200), done: false, doneDates: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mutate((d) => ({ ...d, items: [twin, ...d.items] }));
    return twin;
  }, []);

  // Completion of one occurrence (repeating) or the item itself (one-off).
  const toggleDone = useCallback((id: string, date: string | null) => {
    mutate((d) => ({
      ...d,
      items: d.items.map((x) => {
        if (x.id !== id) return x;
        if (x.recurrence.freq === "none" || !date) return { ...x, done: !x.done, updatedAt: new Date().toISOString() };
        const has = x.doneDates.includes(date);
        return { ...x, doneDates: has ? x.doneDates.filter((v) => v !== date) : [...x.doneDates, date], updatedAt: new Date().toISOString() };
      }),
    }));
  }, []);

  // Delete one date of a repeating item without touching the others.
  const skipOccurrence = useCallback((id: string, date: string) => {
    mutate((d) => ({ ...d, items: d.items.map((x) => (x.id === id && !x.skipDates.includes(date) ? { ...x, skipDates: [...x.skipDates, date] } : x)) }));
  }, []);

  const addFromEvent = useCallback((event: EventView): "added" | "exists" | "failed" => {
    const current = parse(snapshot());
    if (current.items.some((x) => x.linkedEvent?.id === event.id)) return "exists";
    const ok = mutate((d) => ({ ...d, items: [itemFromEvent(event, d.settings.defaultReminder), ...d.items].slice(0, MAX_ITEMS) }));
    return ok ? "added" : "failed";
  }, []);

  const importItems = useCallback((list: ImportedItem[]) => {
    const items = list.map((i) =>
      blankItem({
        kind: i.kind,
        title: i.title,
        date: i.date,
        endDate: i.endDate,
        allDay: i.allDay,
        startTime: i.startTime,
        endTime: i.endTime,
        location: i.location,
        notes: [i.notes, ...i.caveats].filter(Boolean).join("\n").slice(0, 2000),
        recurrence: i.recurrence,
        reminders: i.reminders,
        done: i.done,
        skipDates: i.skipDates,
      }),
    );
    return mutate((d) => ({ ...d, items: [...items, ...d.items].slice(0, MAX_ITEMS) }));
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } })), []);

  const markFired = useCallback((ids: string[]) => {
    const now = Date.now();
    mutate((d) => {
      const fired = { ...d.fired };
      for (const id of ids) fired[id] = now;
      // Keep the record small.
      const entries = Object.entries(fired).sort((a, b) => a[1] - b[1]).slice(-1000);
      return { ...d, fired: Object.fromEntries(entries) };
    });
  }, []);

  const clearAll = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // nothing to clear
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { data, items: data.items, settings: data.settings, save, remove, duplicate, toggleDone, skipOccurrence, addFromEvent, importItems, setSettings, markFired, clearAll };
}
