import { addDays, instant, isTime } from "@/lib/calendar/dates";
import { NO_REPEAT, type CalItem, type Freq } from "@/lib/calendar/types";

// Standard iCalendar (.ics) export and import. Imports come from files the
// visitor chose, but are still treated as untrusted: size and count are
// capped, text is stripped of control characters and length-limited, and only
// fields the calendar understands are read.

const MAX_BYTES = 1_000_000;
const MAX_COMPONENTS = 500;
const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// ── Export ────────────────────────────────────────────────────────────────

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 octets are folded, as the standard requires.
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    if (enc.encode(current + ch).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const compactDate = (d: string) => d.replace(/-/g, "");
const compactDateTime = (d: string, t: string) => `${compactDate(d)}T${t.replace(":", "")}00`;

const TIMEZONE_BLOCK = [
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Tokyo",
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZOFFSETFROM:+0900",
  "TZOFFSETTO:+0900",
  "TZNAME:JST",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function rrule(item: CalItem): string | null {
  const r = item.recurrence;
  if (r.freq === "none") return null;
  const parts = [`FREQ=${r.freq.toUpperCase()}`];
  if (r.interval > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.freq === "weekly" && r.weekdays.length) parts.push(`BYDAY=${r.weekdays.map((d) => DAY_CODES[d]).join(",")}`);
  const timed = item.startTime && !item.allDay;
  if (r.until) parts.push(`UNTIL=${timed ? `${compactDate(r.until)}T145959Z` : compactDate(r.until)}`);
  else if (r.count) parts.push(`COUNT=${r.count}`);
  return parts.join(";");
}

export function toIcs(items: CalItem[], now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LIVE CITY JAPAN//Calendar//EN", "CALSCALE:GREGORIAN", "X-WR-TIMEZONE:Asia/Tokyo", ...TIMEZONE_BLOCK];

  for (const item of items) {
    const isTask = item.kind === "task";
    const timed = Boolean(item.startTime && !item.allDay && item.date);
    lines.push(isTask ? "BEGIN:VTODO" : "BEGIN:VEVENT", `UID:${item.id}@livecityjapan`, `DTSTAMP:${stamp}`, `SUMMARY:${escapeText(item.title)}`);

    if (item.date) {
      if (isTask) {
        lines.push(`DUE;VALUE=DATE:${compactDate(item.date)}`);
      } else if (timed) {
        lines.push(`DTSTART;TZID=Asia/Tokyo:${compactDateTime(item.date, item.startTime as string)}`);
        const endDay = item.endDate ?? item.date;
        if (item.endTime) lines.push(`DTEND;TZID=Asia/Tokyo:${compactDateTime(endDay, item.endTime)}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${compactDate(item.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(item.endDate ?? item.date, 1))}`);
      }
    }
    const rule = rrule(item);
    if (rule && item.date) {
      lines.push(`RRULE:${rule}`);
      for (const skip of item.skipDates) {
        lines.push(timed ? `EXDATE;TZID=Asia/Tokyo:${compactDateTime(skip, item.startTime as string)}` : `EXDATE;VALUE=DATE:${compactDate(skip)}`);
      }
    }
    if (item.location) lines.push(`LOCATION:${escapeText(item.location)}`);
    const notes = [item.notes, item.linkedEvent?.url ? `Event page: ${item.linkedEvent.url}` : ""].filter(Boolean).join("\n");
    if (notes) lines.push(`DESCRIPTION:${escapeText(notes)}`);
    if (isTask) lines.push(`STATUS:${item.done ? "COMPLETED" : "NEEDS-ACTION"}`);
    for (const minutes of item.reminders) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(item.title)}`, `TRIGGER:-PT${minutes}M`, "END:VALARM");
    }
    lines.push(isTask ? "END:VTODO" : "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// ── Import ────────────────────────────────────────────────────────────────

export interface ImportedItem {
  title: string;
  kind: "event" | "task";
  date: string | null;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  location: string;
  notes: string;
  recurrence: CalItem["recurrence"];
  reminders: number[];
  done: boolean;
  skipDates: string[];
  // Anything in the file that couldn't be imported faithfully.
  caveats: string[];
}

export interface ImportResult {
  items: ImportedItem[];
  skipped: number;
  errors: string[];
}

function clean(text: string, max: number): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

function unescapeText(s: string): string {
  return s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

interface Line {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseLine(raw: string): Line | null {
  const colon = raw.indexOf(":");
  if (colon < 1) return null;
  const [name, ...paramParts] = raw.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: raw.slice(colon + 1) };
}

// A wall-clock time in a named zone to a real moment.
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date | null {
  try {
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const asIfUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    return new Date(guess - (asIfUtc - guess));
  } catch {
    return null;
  }
}

const JST_PARTS = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// An iCalendar date or date-time as Japan wall-clock date and time.
function toJst(line: Line): { date: string; time: string | null } | null {
  const v = line.value.trim();
  const dateOnly = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, time: null };
  const dt = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/);
  if (!dt) return null;
  const [y, mo, d, h, mi] = [dt[1], dt[2], dt[3], dt[4], dt[5]].map(Number);
  let moment: Date | null;
  if (dt[7] === "Z") moment = new Date(Date.UTC(y, mo - 1, d, h, mi));
  else if (!line.params.TZID || line.params.TZID === "Asia/Tokyo") return { date: `${dt[1]}-${dt[2]}-${dt[3]}`, time: `${dt[4]}:${dt[5]}` };
  else moment = zonedToUtc(y, mo, d, h, mi, line.params.TZID);
  if (!moment) return null;
  const p = Object.fromEntries(JST_PARTS.formatToParts(moment).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function parseIcs(text: string): ImportResult {
  const errors: string[] = [];
  if (text.length > MAX_BYTES) return { items: [], skipped: 0, errors: ["That file is too large to import (over 1 MB)."] };
  if (!/BEGIN:VCALENDAR/i.test(text)) return { items: [], skipped: 0, errors: ["This doesn't look like a calendar (.ics) file."] };

  // Unfold continued lines.
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const items: ImportedItem[] = [];
  let skipped = 0;
  let current: Line[] | null = null;
  let kind: "event" | "task" = "event";
  let seen = 0;

  for (const raw of lines) {
    const upper = raw.toUpperCase();
    if (upper === "BEGIN:VEVENT" || upper === "BEGIN:VTODO") {
      current = [];
      kind = upper === "BEGIN:VTODO" ? "task" : "event";
      continue;
    }
    if (upper === "END:VEVENT" || upper === "END:VTODO") {
      if (current && ++seen <= MAX_COMPONENTS) {
        const item = build(current, kind);
        if (item) items.push(item);
        else skipped++;
      } else if (seen > MAX_COMPONENTS) {
        skipped++;
      }
      current = null;
      continue;
    }
    if (current && !upper.startsWith("BEGIN:") && !upper.startsWith("END:")) {
      const l = parseLine(raw);
      if (l) current.push(l);
    }
  }
  if (seen > MAX_COMPONENTS) errors.push(`Only the first ${MAX_COMPONENTS} entries were read.`);
  return { items, skipped, errors };
}

function build(props: Line[], kind: "event" | "task"): ImportedItem | null {
  const get = (n: string) => props.find((p) => p.name === n);
  const title = clean(unescapeText(get("SUMMARY")?.value ?? ""), 200);
  if (!title) return null;
  const caveats: string[] = [];
  const startProp = get("DTSTART") ?? get("DUE");
  const start = startProp ? toJst(startProp) : null;
  const endProp = get("DTEND");
  const end = endProp ? toJst(endProp) : null;
  if (startProp && !start) caveats.push("The start date couldn't be read.");
  if (kind === "event" && !start) return null;

  const allDay = Boolean(start && start.time === null);
  let endDate: string | null = start?.date ?? null;
  let endTime: string | null = null;
  if (end) {
    if (allDay) endDate = addDays(end.date, -1) >= (start?.date ?? "") ? addDays(end.date, -1) : (start?.date ?? null); // DTEND is exclusive
    else {
      endDate = end.date;
      endTime = end.time;
    }
  }

  // Repeat rule: only the common forms are supported.
  const recurrence = { ...NO_REPEAT };
  const rule = get("RRULE")?.value;
  if (rule) {
    const kv = Object.fromEntries(rule.split(";").map((p) => p.split("=") as [string, string]));
    const freq = (kv.FREQ ?? "").toLowerCase() as Freq;
    const unsupported = Object.keys(kv).some((k) => !["FREQ", "INTERVAL", "BYDAY", "UNTIL", "COUNT", "WKST"].includes(k));
    if (!["daily", "weekly", "monthly", "yearly"].includes(freq) || unsupported || /\d[A-Z]{2}/.test(kv.BYDAY ?? "")) {
      caveats.push("This item repeats in a way the calendar can't represent, so only the first date was imported.");
    } else {
      recurrence.freq = freq;
      recurrence.interval = Math.min(99, Math.max(1, Number(kv.INTERVAL) || 1));
      if (kv.BYDAY) recurrence.weekdays = kv.BYDAY.split(",").map((d) => DAY_CODES.indexOf(d)).filter((i) => i >= 0);
      const until = kv.UNTIL ? toJst({ name: "UNTIL", params: {}, value: kv.UNTIL }) : null;
      if (until) recurrence.until = until.date;
      else if (kv.COUNT && Number(kv.COUNT) > 0) recurrence.count = Math.min(1000, Number(kv.COUNT));
    }
  }

  const reminders = props
    .filter((p) => p.name === "TRIGGER")
    .map((p) => p.value.match(/^-PT(?:(\d+)H)?(?:(\d+)M)?$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0))
    .slice(0, 5);

  const skipDates = props
    .filter((p) => p.name === "EXDATE")
    .flatMap((p) => p.value.split(",").map((v) => toJst({ ...p, value: v })?.date))
    .filter((d): d is string => Boolean(d));

  return {
    title,
    kind,
    date: start?.date ?? null,
    endDate: endDate && endDate !== start?.date ? endDate : null,
    allDay,
    startTime: start?.time && isTime(start.time) ? start.time : null,
    endTime: endTime && isTime(endTime) ? endTime : null,
    location: clean(unescapeText(get("LOCATION")?.value ?? ""), 200),
    notes: clean(unescapeText(get("DESCRIPTION")?.value ?? ""), 2000),
    recurrence,
    reminders,
    done: get("STATUS")?.value.toUpperCase() === "COMPLETED",
    skipDates,
    caveats,
  };
}

// Exposed for tests.
export { instant };
