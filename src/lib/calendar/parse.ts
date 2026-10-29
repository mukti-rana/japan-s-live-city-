import { addDays, startOfWeek, weekday } from "@/lib/calendar/dates";
import { NO_REPEAT, type Category, type ItemKind, type Recurrence } from "@/lib/calendar/types";

// Reads a sentence like "Dentist next Tuesday 3pm" or "毎週月曜 9時 ゴミ出し"
// and proposes an item. It NEVER saves anything: the result only pre-fills the
// form, lists what was understood, and warns about anything it had to guess —
// so a wrong guess can never end up silently in the calendar.

export interface Proposal {
  title: string;
  kind: ItemKind;
  category: Category;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  recurrence: Recurrence;
  reminders: number[];
  location: string;
  // What was understood, for display: [label, text found].
  understood: [string, string][];
  // Things that were guessed or that the reader couldn't place.
  warnings: string[];
}

const EN_DAYS: Record<string, number> = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
const JA_DAYS: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
const MONTHS: Record<string, number> = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };

const DAY_RE = "(?:sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)";
const MONTH_RE = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function validDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
}

// The next time a month/day comes round (this year if still ahead, else next).
function nextMonthDay(today: string, m: number, d: number, warnings: string[]): string | null {
  const y = Number(today.slice(0, 4));
  const thisYear = validDate(y, m, d);
  if (thisYear && thisYear >= today) return thisYear;
  const next = validDate(y + 1, m, d);
  if (next) warnings.push(`That date has passed this year, so I used ${next}.`);
  return next;
}

function nextWeekday(today: string, target: number, strictlyAfter: boolean, weeksAhead = 0): string {
  let diff = (target - weekday(today) + 7) % 7;
  if (diff === 0 && strictlyAfter) diff = 7;
  return addDays(today, diff + weeksAhead * 7);
}

// "Next Friday" / 来週金曜: that weekday in the following calendar week
// (weeks start on Monday).
function inNextWeek(today: string, target: number): string {
  const mondayNext = addDays(startOfWeek(today, 1), 7);
  return addDays(mondayNext, (target + 6) % 7);
}

const CATEGORY_RULES: [Category, RegExp][] = [
  ["health", /doctor|dentist|clinic|hospital|checkup|check-up|medicine|physio|病院|歯医者|診察|薬/i],
  ["bill", /\bbill\b|\brent\b|invoice|pay(?:ment)?\b|家賃|支払|振込|請求/i],
  ["assignment", /assignment|homework|essay|report|deadline|submit|課題|レポート|提出|締め切り|宿題/i],
  ["class", /\bclass\b|lecture|lesson|course|seminar|exam|授業|講義|試験|レッスン/i],
  ["work", /\bshift\b|\bwork\b|meeting|interview|presentation|バイト|仕事|会議|出勤|シフト/i],
  ["shopping", /\bbuy\b|shopping|grocer|errand|supermarket|買い物|買う|スーパー/i],
  ["travel", /flight|train|trip|hotel|travel|airport|shinkansen|旅行|新幹線|空港|ホテル/i],
  ["habit", /gym|workout|exercise|run\b|jog|yoga|meditat|study|運動|ジム|勉強|散歩/i],
  ["goal", /\bgoal\b|目標/i],
  ["appointment", /appointment|appt|visit|reservation|booking|予約|面会/i],
];

export function parseQuickAdd(input: string, today: string): Proposal {
  const warnings: string[] = [];
  const understood: [string, string][] = [];
  let rest = ` ${input.trim()} `;
  let recurrence: Recurrence = { ...NO_REPEAT };
  let date: string | null = null;
  let startTime: string | null = null;
  let endTime: string | null = null;
  let location = "";
  let reminders: number[] = [];

  const take = (re: RegExp): RegExpMatchArray | null => {
    const m = rest.match(re);
    if (m) rest = rest.replace(re, " ");
    return m;
  };

  // ── Reminder: "remind me 30 minutes before", "30分前" ──
  let m = take(/\bremind(?:\s+me)?\s+(\d+)\s*(min(?:ute)?s?|h(?:ou)?rs?|days?)\s+before\b/i) ?? take(/(\d+)\s*(分|時間|日)前に?(?:通知|リマインド)/);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const minutes = /^(h|時)/.test(unit) ? n * 60 : /^(d|日)/.test(unit) ? n * 1440 : n;
    reminders = [minutes];
    understood.push(["Reminder", `${minutes} min before`]);
  }

  // ── Repeats ──
  m = take(/\bevery\s+(?:other|2nd)\s+week\b/i);
  if (m) {
    recurrence = { ...NO_REPEAT, freq: "weekly", interval: 2 };
    understood.push(["Repeats", "every 2 weeks"]);
  } else if ((m = take(new RegExp(`\\bevery\\s+((?:${DAY_RE})(?:\\s*(?:,|and|&)\\s*(?:${DAY_RE}))*)`, "i")))) {
    const days = [...m[1].toLowerCase().matchAll(/[a-z]+/g)].map((x) => EN_DAYS[x[0]]).filter((d) => d !== undefined);
    recurrence = { ...NO_REPEAT, freq: "weekly", weekdays: [...new Set(days)].sort() };
    understood.push(["Repeats", `weekly on ${m[1].trim()}`]);
  } else if ((m = take(/\bevery\s+weekday\b|\bweekdays\b|平日/i))) {
    recurrence = { ...NO_REPEAT, freq: "weekly", weekdays: [1, 2, 3, 4, 5] };
    understood.push(["Repeats", "every weekday"]);
  } else if ((m = take(/\bevery\s+(\d+)\s+(day|week|month|year)s?\b/i))) {
    const freq = ({ day: "daily", week: "weekly", month: "monthly", year: "yearly" } as const)[m[2].toLowerCase() as "day"];
    recurrence = { ...NO_REPEAT, freq, interval: Math.max(1, Number(m[1])) };
    understood.push(["Repeats", `every ${m[1]} ${m[2]}s`]);
  } else if ((m = take(/\b(?:every\s+day|daily|each\s+day)\b|毎日/i))) {
    recurrence = { ...NO_REPEAT, freq: "daily" };
    understood.push(["Repeats", "every day"]);
  } else if ((m = take(/毎週\s*([日月火水木金土])曜?日?/))) {
    recurrence = { ...NO_REPEAT, freq: "weekly", weekdays: [JA_DAYS[m[1]]] };
    understood.push(["Repeats", `毎週${m[1]}曜日`]);
  } else if ((m = take(/\b(?:every\s+week|weekly)\b|毎週/i))) {
    recurrence = { ...NO_REPEAT, freq: "weekly" };
    understood.push(["Repeats", "every week"]);
  } else if ((m = take(/毎月\s*(\d{1,2})日/))) {
    recurrence = { ...NO_REPEAT, freq: "monthly" };
    const day = Number(m[1]);
    const y = Number(today.slice(0, 4));
    const mo = Number(today.slice(5, 7));
    date = validDate(y, mo, day) && validDate(y, mo, day)! >= today ? validDate(y, mo, day) : (validDate(y, mo + 1 > 12 ? 1 : mo + 1, day) ?? null);
    understood.push(["Repeats", `毎月${day}日`]);
  } else if ((m = take(/\b(?:every\s+month|monthly)(?:\s+on\s+the\s+(\d{1,2})(?:st|nd|rd|th)?)?\b|毎月/i))) {
    recurrence = { ...NO_REPEAT, freq: "monthly" };
    if (m[1]) {
      const day = Number(m[1]);
      const y = Number(today.slice(0, 4));
      const mo = Number(today.slice(5, 7));
      const here = validDate(y, mo, day);
      date = here && here >= today ? here : validDate(mo === 12 ? y + 1 : y, mo === 12 ? 1 : mo + 1, day);
    }
    understood.push(["Repeats", m[1] ? `monthly on day ${m[1]}` : "every month"]);
  } else if ((m = take(/\b(?:every\s+year|yearly|annually)\b|毎年/i))) {
    recurrence = { ...NO_REPEAT, freq: "yearly" };
    understood.push(["Repeats", "every year"]);
  }

  // ── Date ──
  if (!date) {
    if ((m = take(/\b(\d{4})-(\d{2})-(\d{2})\b/))) {
      date = validDate(Number(m[1]), Number(m[2]), Number(m[3]));
      if (date) understood.push(["Date", m[0].trim()]);
      else warnings.push(`“${m[0].trim()}” isn't a real date.`);
    } else if ((m = take(/\bday after tomorrow\b|明後日/i))) {
      date = addDays(today, 2);
      understood.push(["Date", m[0].trim()]);
    } else if ((m = take(/\btomorrow\b|明日/i))) {
      date = addDays(today, 1);
      understood.push(["Date", m[0].trim()]);
    } else if ((m = take(/\btoday\b|\btonight\b|今日|今夜/i))) {
      date = today;
      if (/tonight|今夜/i.test(m[0])) {
        startTime = startTime ?? "19:00";
        warnings.push("“Tonight” was read as 19:00.");
      }
      understood.push(["Date", m[0].trim()]);
    } else if ((m = take(/\bin\s+(\d+)\s+(day|week)s?\b/i))) {
      date = addDays(today, Number(m[1]) * (m[2].toLowerCase() === "week" ? 7 : 1));
      understood.push(["Date", m[0].trim()]);
    } else if ((m = take(new RegExp(`\\b(next|this)\\s+(${DAY_RE})\\b`, "i")))) {
      const target = EN_DAYS[m[2].toLowerCase()];
      date = m[1].toLowerCase() === "next" ? inNextWeek(today, target) : nextWeekday(today, target, false);
      understood.push(["Date", m[0].trim()]);
    } else if ((m = take(/(来週|今週)\s*([日月火水木金土])曜?日?/))) {
      const target = JA_DAYS[m[2]];
      date = m[1] === "来週" ? inNextWeek(today, target) : nextWeekday(today, target, false);
      understood.push(["Date", m[0].trim()]);
    } else if ((m = take(new RegExp(`\\b(?:on\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_RE})\\b`, "i"))) || (m = take(new RegExp(`\\b(?:on\\s+)?(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i")))) {
      const first = m[1];
      const second = m[2];
      const monthName = (/^\d/.test(first) ? second : first).toLowerCase();
      const day = Number(/^\d/.test(first) ? first : second);
      date = nextMonthDay(today, MONTHS[monthName], day, warnings);
      if (date) understood.push(["Date", m[0].trim()]);
      else warnings.push(`“${m[0].trim()}” isn't a real date.`);
    } else if ((m = take(/(\d{1,2})月\s*(\d{1,2})日/))) {
      date = nextMonthDay(today, Number(m[1]), Number(m[2]), warnings);
      if (date) understood.push(["Date", m[0].trim()]);
      else warnings.push(`“${m[0].trim()}” isn't a real date.`);
    } else if ((m = take(/\b(\d{1,2})\/(\d{1,2})\b/))) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      // Month/day, unless the first number can only be a day.
      const [mo, d] = a > 12 ? [b, a] : [a, b];
      if (a <= 12 && b <= 12 && a !== b) warnings.push(`“${m[0]}” could be month/day or day/month — I read it as month ${mo}, day ${d}.`);
      date = nextMonthDay(today, mo, d, warnings);
      if (date) understood.push(["Date", m[0]]);
      else warnings.push(`“${m[0]}” isn't a real date.`);
    } else if ((m = take(new RegExp(`\\b(${DAY_RE})\\b`, "i"))) || (m = take(/([日月火水木金土])曜日?/))) {
      const target = /[a-z]/i.test(m[1]) ? EN_DAYS[m[1].toLowerCase()] : JA_DAYS[m[1]];
      date = nextWeekday(today, target, true);
      if (weekday(today) === target) warnings.push("That weekday is today, so I used next week — change it if you meant today.");
      understood.push(["Date", m[0].trim()]);
    }
  }

  // ── Time ──
  const to24 = (h: number, mer: string | undefined, min = 0): string | null => {
    let hour = h;
    if (mer) {
      const pm = /^p/i.test(mer) || mer === "午後";
      if (h < 1 || h > 12) return null;
      hour = pm ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;
    }
    return hour <= 23 && min < 60 ? `${pad(hour)}:${pad(min)}` : null;
  };

  const MER = "(am|pm|a\\.m\\.|p\\.m\\.)";
  const rangeEn = take(new RegExp(`\\b(?:from\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*${MER}?\\s*(?:-|–|to|until)\\s*(\\d{1,2})(?::(\\d{2}))?\\s*${MER}\\b`, "i"));
  // groups: 1 start hour, 2 start minutes, 3 start am/pm, 4 end hour, 5 end minutes, 6 end am/pm
  if (rangeEn) {
    const endMer = rangeEn[6].replace(/\./g, "");
    const startMer = (rangeEn[3] ?? endMer).replace(/\./g, "");
    startTime = to24(Number(rangeEn[1]), startMer, Number(rangeEn[2] ?? 0));
    endTime = to24(Number(rangeEn[4]), endMer, Number(rangeEn[5] ?? 0));
    if (startTime && endTime) understood.push(["Time", `${startTime}–${endTime}`]);
    else warnings.push("I couldn't read that time range.");
  } else if ((m = take(/\b(\d{1,2}):(\d{2})\s*(?:-|–|to)\s*(\d{1,2}):(\d{2})\b/))) {
    startTime = to24(Number(m[1]), undefined, Number(m[2]));
    endTime = to24(Number(m[3]), undefined, Number(m[4]));
    if (startTime && endTime) understood.push(["Time", `${startTime}–${endTime}`]);
  } else if ((m = take(/(午前|午後)?\s*(\d{1,2})時(?:\s*(\d{1,2})分)?\s*(?:から|〜|-)\s*(午前|午後)?\s*(\d{1,2})時(?:\s*(\d{1,2})分)?/))) {
    startTime = to24(Number(m[2]), m[1], Number(m[3] ?? 0));
    endTime = to24(Number(m[5]), m[4] ?? m[1], Number(m[6] ?? 0));
    if (startTime && endTime) understood.push(["Time", `${startTime}–${endTime}`]);
  } else if ((m = take(new RegExp(`\\b(?:at\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*${MER}\\b`, "i")))) {
    startTime = to24(Number(m[1]), m[3].replace(/\./g, ""), Number(m[2] ?? 0));
    if (startTime) understood.push(["Time", startTime]);
    else warnings.push(`“${m[0].trim()}” isn't a valid time.`);
  } else if ((m = take(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/))) {
    startTime = to24(Number(m[1]), undefined, Number(m[2]));
    if (startTime) understood.push(["Time", startTime]);
  } else if ((m = take(/(午前|午後)?\s*(\d{1,2})時(?:\s*(\d{1,2})分)?/))) {
    startTime = to24(Number(m[2]), m[1], Number(m[3] ?? 0));
    if (startTime) understood.push(["Time", startTime]);
    else warnings.push(`“${m[0].trim()}” isn't a valid time.`);
  } else if ((m = take(/\bnoon\b|正午/i))) {
    startTime = "12:00";
    understood.push(["Time", "12:00"]);
  } else if ((m = take(/\bmidnight\b/i))) {
    startTime = "00:00";
    understood.push(["Time", "00:00"]);
  } else if ((m = rest.match(/\bat\s+(\d{1,2})\b(?!\s*[:\w])/i))) {
    // "at 5" with no am/pm: deliberately not guessed.
    warnings.push(`I didn't read “${m[0].trim()}” as a time because it has no am/pm — add am or pm, or use 24-hour time.`);
  }

  // ── Where ──
  m = rest.match(/(?:\s@\s*|\s+at\s+|\s+in\s+)((?:[A-Z][\w'’.-]*\s*){1,5})\s*$/) ?? rest.match(/(?:に|で)\s*$/);
  if (m && m[1]) {
    location = m[1].trim();
    rest = rest.replace(m[0], " ");
    understood.push(["Place", location]);
  }

  // ── Kind and category ──
  const whole = input;
  const looksLikeTask = /^\s*(?:remind me to|todo|to-?do|task|buy|pay|submit|finish|call)\b|\bdue\b|\bdeadline\b|提出|締め切り|買う|払う/i.test(whole);
  const kind: ItemKind = looksLikeTask && !startTime ? "task" : "event";
  const category = CATEGORY_RULES.find(([, re]) => re.test(whole))?.[0] ?? "other";

  // ── Title: what's left, tidied ──
  let title = rest
    .replace(/^\s*(?:remind me to|todo:?|task:?)\s+/i, " ")
    .replace(/\b(?:on|at|from|to|until|by|every|for)\b\s*$/i, " ")
    .replace(/^\s*(?:on|at|from|by)\b\s+/i, " ")
    .replace(/\s*[,;–-]+\s*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) {
    title = input.trim();
    warnings.push("I couldn't find a title, so I used your whole sentence. Please edit it.");
  } else {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  const timedRecurrenceWithoutDate = recurrence.freq !== "none" && !date;
  if (timedRecurrenceWithoutDate) {
    date = recurrence.freq === "weekly" && recurrence.weekdays.length ? nextWeekday(today, recurrence.weekdays[0], false) : today;
    warnings.push(`No start date was given, so the first one is ${date}.`);
  }
  if (!date && kind === "event") warnings.push("I couldn't find a date. Please choose one.");

  return { title, kind, category, date, startTime, endTime, allDay: Boolean(date && !startTime && kind === "event"), recurrence, reminders, location, understood, warnings };
}
