"use client";

import { Check } from "lucide-react";
import { addDays, minutesOfDay, monthGrid, weekDays } from "@/lib/calendar/dates";
import { C, CATEGORY_COLOR } from "@/lib/calendar/strings";
import type { Occurrence } from "@/lib/calendar/types";
import type { EventView } from "@/lib/events/query";
import { useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface Entry {
  key: string;
  source: "personal" | "task" | "holiday" | "event" | "estimated";
  title: string;
  date: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  done?: boolean;
  category?: string;
  occ?: Occurrence;
  event?: EventView;
}

interface ViewProps {
  entries: Entry[];
  anchor: string;
  today: string;
  weekStartsOn: 0 | 1;
  onPick: (e: Entry) => void;
  onDay: (date: string) => void;
  onToggle: (e: Entry) => void;
}

const dayEntries = (entries: Entry[], day: string) => entries.filter((e) => e.date <= day && e.endDate >= day);

function fmtDay(date: string, language: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(language, { timeZone: "UTC", ...opts }).format(new Date(`${date}T00:00:00Z`));
}

const ORDER = { holiday: 0, personal: 1, task: 2, event: 3, estimated: 4 } as const;
const sortEntries = (a: Entry, b: Entry) => ORDER[a.source] - ORDER[b.source] || (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.title.localeCompare(b.title);

// One entry as a compact chip. The look says what it is: your own items carry
// their category colour, official holidays are red, confirmed public events
// have a purple edge, and estimated dates are dashed.
export function Chip({ entry, onPick, onToggle, compact = false }: { entry: Entry; onPick: (e: Entry) => void; onToggle: (e: Entry) => void; compact?: boolean }) {
  const t = useInline(C);
  const base = "flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-[11px] font-medium leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";
  const size = compact ? "min-h-5 py-0.5" : "min-h-7 py-1";

  if (entry.source === "task") {
    return (
      <div className={`${base} ${size} ${entry.done ? "text-muted line-through" : "text-foreground"} bg-white/[0.04]`}>
        <button type="button" onClick={() => onToggle(entry)} role="checkbox" aria-checked={Boolean(entry.done)} aria-label={`${entry.done ? t("markNotDone") : t("markDone")}: ${entry.title}`} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${entry.done ? "border-mint bg-mint text-background" : "border-white/40"}`}>
          {entry.done && <Check size={11} aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => onPick(entry)} className="min-w-0 flex-1 truncate text-left">
          {entry.title}
        </button>
      </div>
    );
  }

  const style =
    entry.source === "holiday"
      ? "bg-red-500/15 text-red-200"
      : entry.source === "event"
        ? "border-l-2 border-neon-purple bg-neon-purple/10 text-foreground"
        : entry.source === "estimated"
          ? "border border-dashed border-gold/60 text-gold"
          : "bg-white/[0.06] text-foreground";

  return (
    <button type="button" onClick={() => onPick(entry)} className={`${base} ${size} ${style} ${entry.done ? "opacity-50 line-through" : ""}`}>
      {entry.source === "personal" && <span className={`h-2 w-2 shrink-0 rounded-full ${CATEGORY_COLOR[entry.category ?? "other"]}`} aria-hidden="true" />}
      {entry.startTime && !entry.allDay && <span className="shrink-0 tabular-nums text-muted">{entry.startTime}</span>}
      <span className="truncate">{entry.title}</span>
    </button>
  );
}

// ── Month ────────────────────────────────────────────────────────────────

export function MonthView({ entries, anchor, today, weekStartsOn, onPick, onDay, onToggle }: ViewProps) {
  const { language } = useLanguage();
  const weeks = monthGrid(anchor, weekStartsOn);
  const heads = weeks[0];
  const month = anchor.slice(0, 7);

  return (
    <div className="overflow-hidden rounded-2xl border border-glass-border" role="grid" aria-label={fmtDay(anchor, language, { month: "long", year: "numeric" })}>
      <div className="grid grid-cols-7 border-b border-glass-border bg-white/[0.03] text-center text-[11px] font-semibold uppercase tracking-wide text-muted" role="row">
        {heads.map((d) => (
          <div key={d} role="columnheader" className="py-2">
            {fmtDay(d, language, { weekday: "short" })}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid grid-cols-7" role="row">
          {week.map((day) => {
            const list = dayEntries(entries, day).sort(sortEntries);
            const shown = list.slice(0, 3);
            const inMonth = day.slice(0, 7) === month;
            return (
              <div key={day} role="gridcell" className={`min-h-[6.5rem] border-b border-r border-glass-border p-1 last:border-r-0 ${inMonth ? "" : "bg-black/20 opacity-60"}`}>
                <button type="button" onClick={() => onDay(day)} aria-label={fmtDay(day, language, { dateStyle: "full" } as Intl.DateTimeFormatOptions)} className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${day === today ? "bg-azure text-background" : "text-foreground/90 hover:bg-white/10"}`}>
                  {Number(day.slice(8))}
                </button>
                <div className="flex flex-col gap-0.5">
                  {shown.map((e) => (
                    <Chip key={e.key + day} entry={e} onPick={onPick} onToggle={onToggle} compact />
                  ))}
                  {list.length > shown.length && (
                    <button type="button" onClick={() => onDay(day)} className="px-1.5 text-left text-[10px] font-medium text-muted hover:text-foreground">
                      +{list.length - shown.length}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Week and day (timeline) ──────────────────────────────────────────────

const FIRST_HOUR = 6;
const LAST_HOUR = 24;
const HOUR_PX = 44;

interface Placed {
  entry: Entry;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

// Timed entries for one day, laid side by side where they overlap.
function place(day: string, list: Entry[]): Placed[] {
  const timed = list
    .filter((e) => e.startTime && !e.allDay && (e.source === "personal" || e.source === "event" || e.source === "estimated") && e.date === day)
    .sort((a, b) => (a.startTime as string).localeCompare(b.startTime as string));
  const placed: Placed[] = [];
  const laneEnds: number[] = [];
  for (const e of timed) {
    const start = Math.max(minutesOfDay(e.startTime as string), FIRST_HOUR * 60);
    const end = Math.max(e.endTime && e.endDate === e.date ? minutesOfDay(e.endTime) : start + 60, start + 30);
    let lane = laneEnds.findIndex((x) => x <= start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    placed.push({ entry: e, top: ((start - FIRST_HOUR * 60) / 60) * HOUR_PX, height: Math.max(((end - start) / 60) * HOUR_PX - 2, 22), lane, lanes: 1 });
  }
  const lanes = Math.max(1, laneEnds.length);
  return placed.map((p) => ({ ...p, lanes }));
}

function Timeline({ days, entries, today, onPick, onDay, onToggle, single }: ViewProps & { days: string[]; single?: boolean }) {
  const { language } = useLanguage();
  const t = useInline(C);
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);

  return (
    <div className="overflow-hidden rounded-2xl border border-glass-border">
      <div className="grid border-b border-glass-border bg-white/[0.03]" style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((d) => (
          <div key={d} className="border-l border-glass-border p-1.5">
            <button type="button" onClick={() => onDay(d)} className={`flex w-full flex-col items-center rounded-lg py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${d === today ? "bg-azure/20 text-azure" : "text-foreground/85 hover:bg-white/10"}`}>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{fmtDay(d, language, { weekday: "short" })}</span>
              <span className="text-base font-bold">{Number(d.slice(8))}</span>
            </button>
            <div className="mt-1 flex flex-col gap-0.5">
              {dayEntries(entries, d)
                .filter((e) => e.allDay || e.source === "holiday" || e.source === "task" || !e.startTime)
                .sort(sortEntries)
                .slice(0, single ? 12 : 3)
                .map((e) => (
                  <Chip key={e.key + d} entry={e} onPick={onPick} onToggle={onToggle} compact />
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-h-[34rem] overflow-y-auto" role="grid" aria-label={t("agenda")}>
        <div className="grid" style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="pr-1.5 text-right text-[10px] tabular-nums text-muted">
                <span className="relative -top-1.5">{String(h % 24).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>
          {days.map((d) => {
            const placed = place(d, dayEntries(entries, d));
            return (
              <div key={d} className="relative border-l border-glass-border" style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h) => (
                  <div key={h} style={{ height: HOUR_PX }} className="border-b border-white/[0.06]" />
                ))}
                {placed.map((p) => (
                  <button
                    key={p.entry.key}
                    type="button"
                    onClick={() => onPick(p.entry)}
                    style={{ top: p.top, height: p.height, left: `${(p.lane / p.lanes) * 100}%`, width: `calc(${100 / p.lanes}% - 3px)` }}
                    className={`absolute overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
                      p.entry.source === "event" ? "border-l-2 border-neon-purple bg-neon-purple/20" : p.entry.source === "estimated" ? "border border-dashed border-gold/60 bg-gold/10 text-gold" : "bg-azure/20"
                    } ${p.entry.done ? "opacity-50" : ""}`}
                  >
                    <span className="block tabular-nums text-muted">
                      {p.entry.startTime}
                      {p.entry.endTime ? `–${p.entry.endTime}` : ""}
                    </span>
                    <span className="block truncate">{p.entry.title}</span>
                  </button>
                ))}
                {d === today && <NowLine />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NowLine() {
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const [h, m] = now.split(":").map(Number);
  const mins = h * 60 + m;
  if (mins < FIRST_HOUR * 60) return null;
  return <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10 h-px bg-sakura" style={{ top: ((mins - FIRST_HOUR * 60) / 60) * HOUR_PX }} />;
}

export function WeekView(props: ViewProps) {
  return <Timeline {...props} days={weekDays(props.anchor, props.weekStartsOn)} />;
}

export function DayView(props: ViewProps) {
  return <Timeline {...props} days={[props.anchor]} single />;
}

// ── Agenda ───────────────────────────────────────────────────────────────

export function AgendaView({ entries, anchor, today, onPick, onToggle, days = 60 }: ViewProps & { days?: number }) {
  const t = useInline(C);
  const { language } = useLanguage();
  const dates = Array.from({ length: days }, (_, i) => addDays(anchor, i)).filter((d) => dayEntries(entries, d).length > 0);

  if (dates.length === 0) return <p className="rounded-2xl border border-dashed border-glass-border p-8 text-center text-sm text-muted">{t("emptyAgenda")}</p>;
  return (
    <ol className="flex flex-col gap-3">
      {dates.map((d) => (
        <li key={d} className="rounded-2xl border border-glass-border bg-glass-bg p-3">
          <h3 className={`mb-2 text-sm font-semibold ${d === today ? "text-azure" : "text-foreground"}`}>{fmtDay(d, language, { weekday: "long", month: "long", day: "numeric" })}</h3>
          <div className="flex flex-col gap-1">
            {dayEntries(entries, d)
              .sort(sortEntries)
              .map((e) => (
                <Chip key={e.key + d} entry={e} onPick={onPick} onToggle={onToggle} />
              ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
