"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Navigation, X } from "lucide-react";
import { addDays, weekday } from "@/lib/calendar/dates";
import { leaveBy, reminderLabel } from "@/lib/calendar/reminders";
import { C, CATEGORY_LABEL } from "@/lib/calendar/strings";
import { useForecast } from "@/lib/calendar/useExternal";
import { CATEGORIES, NO_REPEAT, type CalItem, type Freq } from "@/lib/calendar/types";
import { jstDate } from "@/lib/events/time";
import { pickJaEn, useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PREFECTURES } from "@/lib/news/places";

const REMINDER_CHOICES = [0, 10, 30, 60, 180, 1440, 2880];
const WEEKDAY_NAMES = (language: string) => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(language, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + i))));

const field =
  "min-h-11 w-full rounded-xl border border-white/20 bg-background px-3 text-base text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";
const label = "flex flex-col gap-1 text-xs font-semibold text-muted";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

// Create or edit an event or task. Nothing is saved until Save is pressed and
// the entries check out; problems are named in plain words next to the form.
export default function ItemForm({
  initial,
  isNew,
  notices = [],
  onSave,
  onCancel,
}: {
  initial: CalItem;
  isNew: boolean;
  // Things the reader should check (from the quick-add reader, for example).
  notices?: string[];
  onSave: (item: CalItem) => void;
  onCancel: () => void;
}) {
  const t = useInline(C);
  const { language } = useLanguage();
  const [item, setItem] = useState<CalItem>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [endMode, setEndMode] = useState<"never" | "until" | "count">(initial.recurrence.until ? "until" : initial.recurrence.count ? "count" : "never");
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const forecast = useForecast(item.prefectureId);
  const set = (patch: Partial<CalItem>) => setItem((i) => ({ ...i, ...patch }));
  const setRec = (patch: Partial<CalItem["recurrence"]>) => setItem((i) => ({ ...i, recurrence: { ...i.recurrence, ...patch } }));
  const isTask = item.kind === "task";

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") return onCancel();
      if (e.key !== "Tab" || !dialogRef.current) return;
      const nodes = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onCancel]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const problems: string[] = [];
    const title = item.title.trim();
    if (!title) problems.push(t("titleRequired"));
    if (!isTask && !item.date) problems.push(t("dateRequired"));
    if (item.date && item.endDate && item.endDate < item.date) problems.push(t("endBeforeStart"));
    if (!isTask && !item.allDay && item.startTime && item.endTime && (item.endDate ?? item.date) === item.date && item.endTime < item.startTime) problems.push(t("endBeforeStart"));
    if (problems.length) return setErrors(problems);

    onSave({
      ...item,
      title,
      allDay: isTask ? false : item.allDay || !item.startTime,
      startTime: isTask || item.allDay ? null : item.startTime,
      endTime: isTask || item.allDay ? null : item.endTime,
      endDate: item.endDate && item.date && item.endDate > item.date ? item.endDate : null,
      reminders: [...new Set(item.reminders)].sort((a, b) => a - b),
      recurrence: item.date ? item.recurrence : { ...NO_REPEAT },
      // The rain notice only makes sense with a place and a date.
      outdoor: Boolean(item.outdoor && item.prefectureId),
    });
  }

  const day = item.date ? forecast.byDate.get(item.date) : undefined;
  const leave = leaveBy(item, item.date ?? jstDate());
  const mapsRoute = item.departure?.origin && item.location ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(item.departure.origin)}&destination=${encodeURIComponent(item.location)}&travelmode=transit` : null;
  const fmtTime = (d: Date) => new Intl.DateTimeFormat(language, { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="item-form-title" className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-glass-border bg-panel shadow-2xl sm:rounded-3xl">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-glass-border p-4 sm:px-6">
            <h2 id="item-form-title" className="text-lg font-bold text-foreground">
              {isNew ? t("newItem") : t("edit")}
            </h2>
            <button type="button" onClick={onCancel} aria-label={t("cancel")} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {notices.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
                <li className="font-semibold">{t("guesses")}</li>
                {notices.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            )}
            {errors.length > 0 && (
              <ul role="alert" className="space-y-1 rounded-xl border border-red-400/50 bg-red-500/10 p-3 text-sm text-red-100">
                {errors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            )}

            <div role="tablist" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-xl border border-glass-border bg-glass-bg p-1">
              {(["event", "task"] as const).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={item.kind === k} onClick={() => set({ kind: k, allDay: k === "task" ? false : item.allDay })} className={`min-h-10 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${item.kind === k ? "bg-azure/20 text-azure" : "text-muted hover:text-foreground"}`}>
                  {k === "event" ? t("eventTab") : t("taskTab")}
                </button>
              ))}
            </div>

            <label className={label}>
              {t("titleLabel")}
              <input ref={firstRef} value={item.title} onChange={(e) => set({ title: e.target.value.slice(0, 200) })} className={field} required />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>
                {t("category")}
                <select value={item.category} onChange={(e) => set({ category: e.target.value as CalItem["category"] })} className={field}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {pickJaEn(CATEGORY_LABEL[c] as { en: string; ja: string }, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                {isTask ? t("dueDate") : t("date")}
                <input type="date" value={item.date ?? ""} onChange={(e) => set({ date: e.target.value || null })} className={field} />
              </label>
            </div>

            {!isTask && (
              <>
                <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-foreground">
                  <input type="checkbox" checked={item.allDay} onChange={(e) => set({ allDay: e.target.checked })} className="h-5 w-5 accent-[var(--azure)]" />
                  {t("allDay")}
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {!item.allDay && (
                    <>
                      <label className={label}>
                        {t("start")}
                        <input type="time" value={item.startTime ?? ""} onChange={(e) => set({ startTime: e.target.value || null })} className={field} />
                      </label>
                      <label className={label}>
                        {t("end")}
                        <input type="time" value={item.endTime ?? ""} onChange={(e) => set({ endTime: e.target.value || null })} className={field} />
                      </label>
                    </>
                  )}
                  <label className={label}>
                    {t("endDate")}
                    <input type="date" value={item.endDate ?? ""} min={item.date ?? undefined} onChange={(e) => set({ endDate: e.target.value || null })} className={field} />
                  </label>
                </div>
                {!item.allDay && <p className="-mt-2 text-[11px] text-muted">{t("jstNote")}</p>}
              </>
            )}

            <label className={label}>
              {t("location")}
              <input value={item.location} onChange={(e) => set({ location: e.target.value.slice(0, 200) })} className={field} />
            </label>

            {/* Repeat */}
            <fieldset className="space-y-3 rounded-xl border border-glass-border p-3.5">
              <legend className="px-1 text-xs font-semibold text-muted">{t("repeat")}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>
                  {t("repeat")}
                  <select value={item.recurrence.freq} onChange={(e) => setRec({ freq: e.target.value as Freq, weekdays: [] })} className={field}>
                    <option value="none">{t("never")}</option>
                    <option value="daily">{t("daily")}</option>
                    <option value="weekly">{t("weekly")}</option>
                    <option value="monthly">{t("monthly")}</option>
                    <option value="yearly">{t("yearly")}</option>
                  </select>
                </label>
                {item.recurrence.freq !== "none" && (
                  <label className={label}>
                    {t("every")}
                    <input type="number" min={1} max={99} value={item.recurrence.interval} onChange={(e) => setRec({ interval: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })} className={field} />
                  </label>
                )}
              </div>
              {item.recurrence.freq === "weekly" && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("weekly")}>
                  {WEEKDAY_NAMES(language).map((name, d) => {
                    const on = item.recurrence.weekdays.includes(d) || (item.recurrence.weekdays.length === 0 && item.date !== null && weekday(item.date) === d);
                    return (
                      <button key={d} type="button" aria-pressed={on} onClick={() => setRec({ weekdays: (item.recurrence.weekdays.length ? item.recurrence.weekdays : item.date ? [weekday(item.date)] : []).includes(d) ? (item.recurrence.weekdays.length ? item.recurrence.weekdays : item.date ? [weekday(item.date)] : []).filter((x) => x !== d) : [...(item.recurrence.weekdays.length ? item.recurrence.weekdays : item.date ? [weekday(item.date)] : []), d].sort() })} className={`min-h-10 min-w-11 rounded-lg border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border text-muted hover:text-foreground"}`}>
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
              {item.recurrence.freq !== "none" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={label}>
                    {t("repeatEnds")}
                    <select value={endMode} onChange={(e) => { const m = e.target.value as typeof endMode; setEndMode(m); setRec({ until: m === "until" ? (item.date ? addDays(item.date, 30) : null) : null, count: m === "count" ? 10 : null }); }} className={field}>
                      <option value="never">{t("endsNever")}</option>
                      <option value="until">{t("endsOn")}</option>
                      <option value="count">{t("endsAfter")}</option>
                    </select>
                  </label>
                  {endMode === "until" && (
                    <label className={label}>
                      {t("endsOn")}
                      <input type="date" value={item.recurrence.until ?? ""} min={item.date ?? undefined} onChange={(e) => setRec({ until: e.target.value || null })} className={field} />
                    </label>
                  )}
                  {endMode === "count" && (
                    <label className={label}>
                      {t("endsAfter")}
                      <input type="number" min={1} max={1000} value={item.recurrence.count ?? 10} onChange={(e) => setRec({ count: Math.max(1, Number(e.target.value) || 1) })} className={field} />
                    </label>
                  )}
                </div>
              )}
            </fieldset>

            {/* Reminders */}
            <fieldset className="space-y-2 rounded-xl border border-glass-border p-3.5">
              <legend className="px-1 text-xs font-semibold text-muted">{t("reminders")}</legend>
              <div className="flex flex-wrap gap-1.5">
                {REMINDER_CHOICES.map((m) => {
                  const on = item.reminders.includes(m);
                  return (
                    <button key={m} type="button" aria-pressed={on} onClick={() => set({ reminders: on ? item.reminders.filter((x) => x !== m) : [...item.reminders, m].slice(0, 5) })} className={`min-h-10 rounded-lg border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border text-muted hover:text-foreground"}`}>
                      {reminderLabel(m)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted">{isTask ? "09:00 on the due date" : t("remindersNote")}</p>
            </fieldset>

            <label className={label}>
              {t("notes")}
              <textarea value={item.notes} onChange={(e) => set({ notes: e.target.value.slice(0, 2000) })} rows={3} className={`${field} py-2`} />
            </label>

            {/* Weather */}
            {!isTask && (
              <fieldset className="space-y-2 rounded-xl border border-glass-border p-3.5">
                <legend className="px-1 text-xs font-semibold text-muted">{t("weather")}</legend>
                <label className={label}>
                  {t("weatherPlace")}
                  <select value={item.prefectureId ?? ""} onChange={(e) => set({ prefectureId: e.target.value || null })} className={field}>
                    <option value="">{t("noWeather")}</option>
                    {PREFECTURES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {language === "ja" ? p.ja : p.en}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-10 items-center gap-2.5 text-sm text-foreground">
                  <input type="checkbox" checked={item.outdoor} onChange={(e) => set({ outdoor: e.target.checked })} className="h-5 w-5 accent-[var(--azure)]" />
                  {t("outdoor")}
                </label>
                {item.prefectureId && item.date && (
                  <p className="text-sm text-foreground/85" aria-live="polite">
                    {forecast.loading ? "…" : day ? `${day.condition}, ${day.low}–${day.high}°C · ${day.precipProbability}% ${t("chanceOfRain")}. ${t("forecastOnly")}` : forecast.failed ? "—" : `${t("weather")}: 7-day forecast only.`}
                  </p>
                )}
                {item.outdoor && day && day.precipProbability >= 50 && (
                  <p role="status" className="rounded-lg border border-sky-400/40 bg-sky-400/10 p-2.5 text-sm text-sky-100">
                    {t("rainNotice")} ({day.precipProbability}%). {t("forecastOnly")} {t("cancellationNote")}
                  </p>
                )}
              </fieldset>
            )}

            {/* Departure planner */}
            {!isTask && item.startTime && !item.allDay && (
              <fieldset className="space-y-3 rounded-xl border border-glass-border p-3.5">
                <legend className="px-1 text-xs font-semibold text-muted">{t("departure")}</legend>
                <label className="flex min-h-10 items-center gap-2.5 text-sm text-foreground">
                  <input type="checkbox" checked={Boolean(item.departure)} onChange={(e) => set({ departure: e.target.checked ? { origin: "", travelMinutes: 30, bufferMinutes: 10 } : null })} className="h-5 w-5 accent-[var(--azure)]" />
                  {t("departure")}
                </label>
                {item.departure && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className={label}>
                        {t("depOrigin")}
                        <input value={item.departure.origin} onChange={(e) => set({ departure: { ...(item.departure as NonNullable<CalItem["departure"]>), origin: e.target.value.slice(0, 200) } })} className={field} />
                      </label>
                      <label className={label}>
                        {t("depTravel")}
                        <input type="number" min={0} max={600} value={item.departure.travelMinutes} onChange={(e) => set({ departure: { ...(item.departure as NonNullable<CalItem["departure"]>), travelMinutes: Math.max(0, Number(e.target.value) || 0) } })} className={field} />
                      </label>
                      <label className={label}>
                        {t("depBuffer")}
                        <input type="number" min={0} max={240} value={item.departure.bufferMinutes} onChange={(e) => set({ departure: { ...(item.departure as NonNullable<CalItem["departure"]>), bufferMinutes: Math.max(0, Number(e.target.value) || 0) } })} className={field} />
                      </label>
                    </div>
                    {leave && (
                      <p className="rounded-lg bg-azure/10 p-2.5 text-sm font-semibold text-azure" aria-live="polite">
                        {t("leaveBy")} {fmtTime(leave.leaveAt)} {t("arriveBy")} {fmtTime(leave.arriveBy)}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => set({ reminders: [...new Set([...item.reminders, (item.departure?.travelMinutes ?? 0) + (item.departure?.bufferMinutes ?? 0)])].slice(0, 5) })} className="min-h-10 rounded-lg border border-glass-border px-3 text-sm font-medium text-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                        {t("addLeaveReminder")}
                      </button>
                      {mapsRoute && (
                        <a href={mapsRoute} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-azure hover:underline">
                          <Navigation size={14} aria-hidden="true" />
                          {t("openRoute")}
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-muted">{t("depNote")}</p>
                  </>
                )}
              </fieldset>
            )}

            {item.linkedEvent && (
              <div className="space-y-1.5 rounded-xl border border-gold/30 bg-gold/5 p-3.5 text-sm">
                <p className="font-semibold text-foreground">{t("linkedTitle")}: {item.linkedEvent.title}</p>
                <p className="text-xs text-muted">{item.linkedEvent.sourceName}</p>
                {item.linkedEvent.estimated && <p className="text-xs text-gold">{t("estimatedNote")}</p>}
                {item.linkedEvent.url && (
                  <a href={item.linkedEvent.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-azure hover:underline">
                    {t("officialPage")} <ExternalLink size={11} aria-hidden="true" />
                  </a>
                )}
                <p className="text-[11px] text-muted">{t("cancellationNote")}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-glass-border p-4 sm:px-6">
            <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-glass-border px-5 text-sm font-semibold text-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              {t("cancel")}
            </button>
            <button type="submit" className="min-h-11 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-6 text-sm font-bold text-background hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

