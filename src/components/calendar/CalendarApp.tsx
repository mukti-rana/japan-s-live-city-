"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Pencil, Plus, Search, Settings as SettingsIcon, Sparkles, Trash2, Upload } from "lucide-react";
import { AgendaView, Chip, DayView, MonthView, WeekView, type Entry } from "@/components/calendar/CalendarViews";
import ItemForm from "@/components/calendar/ItemForm";
import SettingsPanel from "@/components/calendar/SettingsPanel";
import EventModal from "@/components/events/EventModal";
import PlacePicker from "@/components/news/PlacePicker";
import { addDays, addMonths, minutesOfDay, monthGrid, weekDays } from "@/lib/calendar/dates";
import { parseIcs, toIcs, type ImportResult } from "@/lib/calendar/ics";
import { parseQuickAdd, type Proposal } from "@/lib/calendar/parse";
import { allOccurrences, describeRecurrence } from "@/lib/calendar/recurrence";
import { dueReminders, reminderLabel } from "@/lib/calendar/reminders";
import { blankItem, useCalendar } from "@/lib/calendar/store";
import { C, CATEGORY_LABEL } from "@/lib/calendar/strings";
import type { CalItem } from "@/lib/calendar/types";
import { useForecast, useHolidays, useLayerEvents } from "@/lib/calendar/useExternal";
import type { EventView } from "@/lib/events/query";
import { jstDate } from "@/lib/events/time";
import { pickJaEn, useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { resolvePlace } from "@/lib/news/places";
import { useNewsPlace } from "@/lib/news/useNews";

type View = "month" | "week" | "day" | "agenda";

const btn = "min-h-10 rounded-xl border border-glass-border px-3.5 text-sm font-semibold text-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

function fmt(date: string, language: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(language, { timeZone: "UTC", ...opts }).format(new Date(`${date}T00:00:00Z`));
}

export default function CalendarApp({ initialQuick = "" }: { initialQuick?: string }) {
  const t = useInline(C);
  const { language } = useLanguage();
  const cal = useCalendar();
  const placeInfo = useNewsPlace();
  const today = jstDate();
  const week = cal.settings.weekStartsOn;

  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(today);
  const [query, setQuery] = useState("");
  const [layers, setLayers] = useState({ personal: true, holidays: true, events: false, estimated: false });
  const [form, setForm] = useState<{ item: CalItem; isNew: boolean; notices: string[] } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [opened, setOpened] = useState<Entry | null>(null);
  const [quick, setQuick] = useState(initialQuick);
  const [proposal, setProposal] = useState<Proposal | null>(() => (initialQuick ? parseQuickAdd(initialQuick, jstDate()) : null));
  const [showSettings, setShowSettings] = useState(false);
  const [importing, setImporting] = useState<ImportResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The dates on screen, and the span to load.
  const { from, to } = useMemo(() => {
    if (view === "month") {
      const grid = monthGrid(anchor, week);
      return { from: grid[0][0], to: grid[grid.length - 1][6] };
    }
    if (view === "week") {
      const days = weekDays(anchor, week);
      return { from: days[0], to: days[6] };
    }
    if (view === "day") return { from: anchor, to: anchor };
    return { from: anchor, to: addDays(anchor, 59) };
  }, [view, anchor, week]);

  const resolved = resolvePlace(placeInfo.place);
  const holidays = useHolidays(layers.holidays);
  const layerEvents = useLayerEvents(from, to, placeInfo.place, layers.events || layers.estimated);
  const forecast = useForecast(resolved?.prefectureId ?? null);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    if (layers.personal) {
      for (const o of allOccurrences(cal.items, from, to)) {
        const it = o.item;
        out.push({ key: o.key, source: it.kind === "task" ? "task" : "personal", title: it.title, date: o.date, endDate: o.endDate, startTime: it.startTime, endTime: it.endTime, allDay: it.allDay || (!it.startTime && it.kind === "event"), done: o.done, category: it.category, occ: o });
      }
    }
    if (layers.holidays) {
      for (const [date, h] of holidays.map) {
        if (date >= from && date <= to) out.push({ key: `hol-${date}`, source: "holiday", title: language === "ja" ? h.name : (h.nameEn ?? h.name), date, endDate: date, startTime: null, endTime: null, allDay: true });
      }
    }
    for (const e of layerEvents.events) {
      const estimated = e.typicalDates;
      if ((estimated && !layers.estimated) || (!estimated && !layers.events)) continue;
      out.push({ key: `ev-${e.id}`, source: estimated ? "estimated" : "event", title: e.title, date: e.current.start, endDate: e.current.end, startTime: e.startTime, endTime: e.endTime, allDay: !e.startTime, event: e });
    }
    const q = query.trim().toLowerCase();
    return q
      ? out.filter((e) => `${e.title} ${e.occ?.item.location ?? ""} ${e.occ?.item.notes ?? ""} ${e.event?.venue ?? ""}`.toLowerCase().includes(q))
      : out;
  }, [cal.items, layers, holidays.map, layerEvents.events, from, to, query, language]);

  // Tasks, kept apart from scheduled events.
  const tasks = useMemo(() => {
    const list = cal.items.filter((i) => i.kind === "task");
    const open = list.filter((i) => !i.done && i.recurrence.freq === "none");
    const overdue = open.filter((i) => i.date && i.date < today).sort((a, b) => (a.date as string).localeCompare(b.date as string));
    const soon = open.filter((i) => i.date && i.date >= today).sort((a, b) => (a.date as string).localeCompare(b.date as string));
    const undated = open.filter((i) => !i.date);
    const repeating = allOccurrences(list.filter((i) => i.recurrence.freq !== "none"), today, addDays(today, 7)).filter((o) => !o.done);
    return { overdue, soon, undated, repeating, doneCount: list.filter((i) => i.done).length };
  }, [cal.items, today]);

  const reminders = useMemo(() => dueReminders(cal.data), [cal.data]);

  function go(delta: number) {
    if (view === "month") setAnchor(addMonths(anchor, delta));
    else if (view === "week") setAnchor(addDays(anchor, 7 * delta));
    else if (view === "day") setAnchor(addDays(anchor, delta));
    else setAnchor(addDays(anchor, 30 * delta));
  }

  const title =
    view === "month"
      ? fmt(anchor, language, { month: "long", year: "numeric" })
      : view === "day"
        ? fmt(anchor, language, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : `${fmt(from, language, { month: "short", day: "numeric" })} – ${fmt(to, language, { month: "short", day: "numeric", year: "numeric" })}`;

  function openNew(partial: Partial<CalItem> = {}, notices: string[] = []) {
    setForm({ item: blankItem({ date: selectedDay ?? (view === "day" ? anchor : today), reminders: cal.settings.defaultReminder === null ? [] : [cal.settings.defaultReminder], ...partial }), isNew: true, notices });
  }

  function reviewQuick() {
    const p = quick.trim() ? parseQuickAdd(quick, today) : null;
    setProposal(p);
    if (!p) return;
    openNew(
      {
        title: p.title,
        kind: p.kind,
        category: p.category,
        date: p.date,
        startTime: p.startTime,
        endTime: p.endTime,
        allDay: p.allDay,
        recurrence: p.recurrence,
        reminders: p.reminders.length ? p.reminders : cal.settings.defaultReminder === null ? [] : [cal.settings.defaultReminder],
        location: p.location,
      },
      p.warnings,
    );
  }

  function pick(e: Entry) {
    if (e.source === "personal" || e.source === "task") setOpened(e);
    else setOpened(e);
  }

  function toggle(e: Entry) {
    if (e.occ) cal.toggleDone(e.occ.item.id, e.occ.date);
  }

  function exportIcs() {
    const blob = new Blob([toIcs(cal.items)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-city-japan-${today}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) return setImporting({ items: [], skipped: 0, errors: ["That file is too large to import (over 1 MB)."] });
    setImporting(parseIcs(await file.text()));
    if (fileRef.current) fileRef.current.value = "";
  }

  const dayList = selectedDay ? entries.filter((e) => e.date <= selectedDay && e.endDate >= selectedDay) : [];
  const viewProps = { entries, anchor, today, weekStartsOn: week, onPick: pick, onDay: (d: string) => { setSelectedDay(d); if (view !== "month") setAnchor(d); }, onToggle: toggle };

  const toggleLayer = (k: keyof typeof layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="bg-gradient-to-r from-azure via-neon-purple to-sakura bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openNew()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-5 text-sm font-bold text-background hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Plus size={16} aria-hidden="true" />
              {t("newItem")}
            </button>
            <button type="button" onClick={() => setShowSettings(true)} className={`${btn} inline-flex items-center gap-2`}>
              <SettingsIcon size={15} aria-hidden="true" />
              {t("settings")}
            </button>
          </div>
        </div>

        {/* Quick add — proposes, never saves */}
        <div className="rounded-2xl border border-glass-border bg-glass-bg p-3">
          <form onSubmit={(e) => { e.preventDefault(); reviewQuick(); }} className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">{t("quickAdd")}</span>
              <Sparkles size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-neon-purple" aria-hidden="true" />
              <input value={quick} onChange={(e) => { setQuick(e.target.value); setProposal(null); }} placeholder={t("quickPlaceholder")} className="h-11 w-full rounded-xl border border-white/20 bg-background pl-10 pr-3 text-base text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure sm:text-sm" />
            </label>
            <button type="submit" disabled={!quick.trim()} className={`${btn} disabled:opacity-50`}>
              {t("quickReview")}
            </button>
          </form>
          <p className="mt-1.5 text-[11px] text-muted">{t("quickNote")}</p>
        </div>
      </header>

      {notice && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-xl border border-mint/30 bg-mint/10 p-3 text-sm text-foreground">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold text-muted hover:text-foreground">
            ✕
          </button>
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAnchor(today)} className={btn}>
          {t("today")}
        </button>
        <button type="button" onClick={() => go(-1)} aria-label={t("prev")} className={`${btn} px-2.5`}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label={t("next")} className={`${btn} px-2.5`}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <h2 className="mx-1 text-lg font-bold text-foreground" aria-live="polite">
          {title}
        </h2>
        <label className="ml-auto flex items-center">
          <span className="sr-only">{t("pickDate")}</span>
          <input type="date" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} className="h-10 rounded-xl border border-glass-border bg-panel px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure" />
        </label>
        <div role="tablist" aria-label="View" className="flex rounded-xl border border-glass-border bg-glass-bg p-1">
          {(["day", "week", "month", "agenda"] as View[]).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`min-h-9 rounded-lg px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${view === v ? "bg-azure/20 text-azure" : "text-muted hover:text-foreground"}`}>
              {t(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-11 w-full rounded-xl border border-glass-border bg-glass-bg pl-10 pr-4 text-base text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure sm:text-sm" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Main view */}
        <div className="min-w-0">
          {view === "month" && <MonthView {...viewProps} />}
          {view === "week" && <WeekView {...viewProps} />}
          {view === "day" && <DayView {...viewProps} />}
          {view === "agenda" && <AgendaView {...viewProps} />}
          {cal.items.length === 0 && view !== "agenda" && <p className="mt-3 rounded-xl border border-dashed border-glass-border p-4 text-center text-sm text-muted">{t("emptyAgenda")}</p>}
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-4">
          <section aria-labelledby="layers-title" className="rounded-2xl border border-glass-border bg-glass-bg p-3.5">
            <h2 id="layers-title" className="text-sm font-bold text-foreground">{t("layers")}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {([["personal", "layerPersonal"], ["holidays", "layerHolidays"], ["events", "layerEvents"], ["estimated", "layerEstimated"]] as const).map(([k, label]) => (
                <li key={k}>
                  <label className="flex min-h-10 items-center gap-2.5 text-sm text-foreground">
                    <input type="checkbox" checked={layers[k]} onChange={() => toggleLayer(k)} className="h-5 w-5 accent-[var(--azure)]" />
                    {t(label)}
                  </label>
                </li>
              ))}
            </ul>
            {(layers.events || layers.estimated) && (
              <div className="mt-2 space-y-2 border-t border-glass-border pt-2.5">
                <PlacePicker current={placeInfo} compact />
                {!placeInfo.place && <p className="text-xs text-muted">{t("eventsNeedPlace")}</p>}
                {layerEvents.failed && <p className="text-xs text-sakura">{t("eventsFailed")}</p>}
                <p className="text-[11px] text-muted">{t("eventsSource")}</p>
              </div>
            )}
            {layers.holidays && (
              <p className="mt-2 text-[11px] text-muted">{holidays.failed ? <span className="text-sakura">{t("holidaysFailed")}</span> : t("holidaysSource")}</p>
            )}
          </section>

          <section aria-labelledby="tasks-title" className="rounded-2xl border border-glass-border bg-glass-bg p-3.5">
            <h2 id="tasks-title" className="text-sm font-bold text-foreground">{t("tasks")}</h2>
            <p className="mt-0.5 text-[11px] text-muted">{t("tasksNote")}</p>
            {([["overdue", tasks.overdue], ["", tasks.soon], ["noDate", tasks.undated]] as const).map(([label, list]) =>
              list.length ? (
                <div key={label || "soon"} className="mt-2">
                  {label && <p className={`text-[11px] font-semibold uppercase tracking-wide ${label === "overdue" ? "text-red-300" : "text-muted"}`}>{t(label)}</p>}
                  <ul className="mt-1 flex flex-col gap-1">
                    {list.map((i) => (
                      <li key={i.id}>
                        <Chip entry={{ key: i.id, source: "task", title: `${i.date ? `${fmt(i.date, language, { month: "short", day: "numeric" })} · ` : ""}${i.title}`, date: i.date ?? today, endDate: i.date ?? today, startTime: null, endTime: null, allDay: false, done: i.done, occ: { key: i.id, item: i, date: i.date ?? today, endDate: i.date ?? today, done: i.done } }} onPick={pick} onToggle={toggle} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
            {tasks.repeating.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {tasks.repeating.slice(0, 6).map((o) => (
                  <li key={o.key}>
                    <Chip entry={{ key: o.key, source: "task", title: `${fmt(o.date, language, { month: "short", day: "numeric" })} · ${o.item.title}`, date: o.date, endDate: o.date, startTime: null, endTime: null, allDay: false, done: o.done, occ: o }} onPick={pick} onToggle={toggle} />
                  </li>
                ))}
              </ul>
            )}
            {!tasks.overdue.length && !tasks.soon.length && !tasks.undated.length && !tasks.repeating.length && <p className="mt-2 text-xs text-muted">{t("emptyDay")}</p>}
          </section>

          {(reminders.fresh.length > 0 || reminders.earlier.length > 0) && (
            <section aria-labelledby="rem-title" className="rounded-2xl border border-gold/30 bg-gold/5 p-3.5">
              <h2 id="rem-title" className="text-sm font-bold text-foreground">{t("remindersEarlier")}</h2>
              <ul className="mt-1.5 flex flex-col gap-1 text-xs text-foreground/85">
                {[...reminders.fresh, ...reminders.earlier].slice(0, 6).map((r) => (
                  <li key={r.id}>
                    {r.item.title} · {reminderLabel(r.minutesBefore)} · {fmt(r.date, language, { month: "short", day: "numeric" })}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="data-title" className="rounded-2xl border border-glass-border bg-glass-bg p-3.5">
            <h2 id="data-title" className="text-sm font-bold text-foreground">{t("yourData")}</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{t("storageNote")}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button type="button" onClick={exportIcs} disabled={cal.items.length === 0} className={`${btn} inline-flex items-center gap-1.5 disabled:opacity-50`}>
                <Download size={14} aria-hidden="true" />
                {t("exportIcs")}
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className={`${btn} inline-flex items-center gap-1.5`}>
                <Upload size={14} aria-hidden="true" />
                {t("importIcs")}
              </button>
              <input ref={fileRef} type="file" accept=".ics,text/calendar" className="sr-only" aria-label={t("importIcs")} onChange={(e) => void onFile(e.target.files?.[0])} />
            </div>
            <p className="mt-2 text-[11px] text-muted">{t("syncNote")}</p>
          </section>
        </aside>
      </div>

      {/* Day panel */}
      {selectedDay && (
        <DayPanel
          day={selectedDay}
          entries={dayList}
          forecast={forecast}
          layerEvents={layerEvents.events.filter((e) => e.current.start <= selectedDay && e.current.end >= selectedDay)}
          personal={cal.items}
          onClose={() => setSelectedDay(null)}
          onNew={() => openNew({ date: selectedDay })}
          onPick={pick}
          onToggle={toggle}
          onOpenEvent={(e) => setOpened({ key: `ev-${e.id}`, source: "event", title: e.title, date: e.current.start, endDate: e.current.end, startTime: e.startTime, endTime: e.endTime, allDay: !e.startTime, event: e })}
        />
      )}

      {proposal && !form && (
        <section aria-label={t("understood")} className="rounded-2xl border border-neon-purple/30 bg-neon-purple/5 p-3.5 text-sm">
          <p className="font-semibold text-foreground">{t("understood")}</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-foreground/85">
            {proposal.understood.map(([k, v]) => (
              <li key={k + v}>
                {k}: <span className="font-medium">{v}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Entry details */}
      {opened && (opened.event ? (
        <EventModal event={opened.event} onClose={() => setOpened(null)} />
      ) : opened.source === "holiday" ? (
        <HolidayNote entry={opened} onClose={() => setOpened(null)} />
      ) : opened.occ ? (
        <EntryDetails
          occ={opened.occ}
          onClose={() => setOpened(null)}
          onEdit={() => { setForm({ item: opened.occ!.item, isNew: false, notices: [] }); setOpened(null); }}
          onDuplicate={() => { const copy = cal.duplicate(opened.occ!.item.id); setOpened(null); if (copy) setNotice(`${t("duplicate")}: ${copy.title}`); }}
          onDeleteOne={() => { cal.skipOccurrence(opened.occ!.item.id, opened.occ!.date); setOpened(null); }}
          onDeleteAll={() => { cal.remove(opened.occ!.item.id); setOpened(null); }}
          onToggle={() => cal.toggleDone(opened.occ!.item.id, opened.occ!.date)}
        />
      ) : null)}

      {form && (
        <ItemForm
          initial={form.item}
          isNew={form.isNew}
          notices={form.notices}
          onCancel={() => setForm(null)}
          onSave={(item) => {
            const ok = cal.save(item);
            setForm(null);
            setProposal(null);
            setQuick("");
            if (!ok) setNotice(t("addFailed"));
            else if (item.date) setAnchor(item.date);
          }}
        />
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {importing && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("importIcs")}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-glass-border bg-panel p-5">
            <h2 className="text-lg font-bold text-foreground">{t("importPreview")}</h2>
            {importing.errors.map((e) => (
              <p key={e} role="alert" className="mt-2 text-sm text-red-200">{e}</p>
            ))}
            {importing.items.length > 0 && (
              <>
                <p className="mt-2 text-sm text-foreground/85">{importing.items.length} {t("eventTab").toLowerCase()} / {t("taskTab").toLowerCase()}{importing.skipped ? ` · ${importing.skipped} skipped` : ""}</p>
                <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm text-foreground/85">
                  {importing.items.slice(0, 50).map((i, n) => (
                    <li key={n}>• {i.date} {i.startTime ?? ""} — {i.title}{i.caveats.length ? " ⚠" : ""}</li>
                  ))}
                </ul>
                {importing.items.some((i) => i.caveats.length) && <p className="mt-2 text-xs text-amber-200">⚠ {importing.items.find((i) => i.caveats.length)?.caveats[0]}</p>}
              </>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setImporting(null)} className={btn}>{t("cancel")}</button>
              {importing.items.length > 0 && (
                <button type="button" onClick={() => { const ok = cal.importItems(importing.items); setNotice(ok ? `${t("importDone")}: ${importing.items.length}` : t("addFailed")); setImporting(null); }} className="min-h-10 rounded-xl bg-azure px-4 text-sm font-bold text-background hover:brightness-110">
                  {t("importConfirm")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

function HolidayNote({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const t = useInline(C);
  const { language } = useLanguage();
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={entry.title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl border border-glass-border bg-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-300">{t("holiday")}</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">{entry.title}</h2>
        <p className="mt-1 text-sm text-foreground/85">{fmt(entry.date, language, { dateStyle: "full" } as Intl.DateTimeFormatOptions)}</p>
        <p className="mt-3 text-xs text-muted">
          <a href="https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-azure hover:underline">
            {t("holidaysSource")} <ExternalLink size={11} aria-hidden="true" />
          </a>
        </p>
        <button type="button" onClick={onClose} autoFocus className={`${btn} mt-4`}>{t("cancel")}</button>
      </div>
    </div>
  );
}

function EntryDetails({ occ, onClose, onEdit, onDuplicate, onDeleteOne, onDeleteAll, onToggle }: { occ: Entry["occ"] & object; onClose: () => void; onEdit: () => void; onDuplicate: () => void; onDeleteOne: () => void; onDeleteAll: () => void; onToggle: () => void }) {
  const t = useInline(C);
  const { language } = useLanguage();
  const it = occ.item;
  const repeats = it.recurrence.freq !== "none";
  const rec = describeRecurrence(it);
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="entry-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-glass-border bg-panel p-5 sm:rounded-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-azure">{pickJaEn(CATEGORY_LABEL[it.category] as { en: string; ja: string }, language)} · {it.kind === "task" ? t("taskTab") : t("eventTab")}</p>
        <h2 id="entry-title" className={`mt-1 text-xl font-bold text-foreground ${occ.done ? "line-through opacity-70" : ""}`}>{it.title}</h2>
        <p className="mt-1.5 text-sm text-foreground/85">
          {fmt(occ.date, language, { dateStyle: "full" } as Intl.DateTimeFormatOptions)}
          {occ.endDate !== occ.date ? ` – ${fmt(occ.endDate, language, { month: "short", day: "numeric" })}` : ""}
          {it.startTime && !it.allDay ? ` · ${it.startTime}${it.endTime ? `–${it.endTime}` : ""} JST` : ""}
        </p>
        {rec && <p className="text-xs text-muted">{rec}</p>}
        {it.location && <p className="mt-1.5 text-sm text-foreground/85">📍 {it.location}</p>}
        {it.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{it.notes}</p>}
        {it.reminders.length > 0 && <p className="mt-2 text-xs text-muted">{t("reminders")}: {it.reminders.map(reminderLabel).join(", ")}</p>}
        {it.linkedEvent?.url && (
          <p className="mt-2 text-sm">
            <a href={it.linkedEvent.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-azure hover:underline">
              {t("officialPage")} <ExternalLink size={12} aria-hidden="true" />
            </a>
            <span className="mt-1 block text-[11px] text-muted">{it.linkedEvent.estimated ? t("estimatedNote") : t("cancellationNote")}</span>
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onToggle} className={btn}>{occ.done ? t("markNotDone") : t("markDone")}</button>
          <button type="button" onClick={onEdit} className={`${btn} inline-flex items-center gap-1.5`}><Pencil size={14} aria-hidden="true" />{t("edit")}</button>
          <button type="button" onClick={onDuplicate} className={`${btn} inline-flex items-center gap-1.5`}><Copy size={14} aria-hidden="true" />{t("duplicate")}</button>
          {repeats && <button type="button" onClick={onDeleteOne} className={`${btn} inline-flex items-center gap-1.5 text-red-200`}><Trash2 size={14} aria-hidden="true" />{t("deleteThis")}</button>}
          <button type="button" onClick={() => { if (!repeats || window.confirm(`${t("deleteAll")}?`)) onDeleteAll(); }} className={`${btn} inline-flex items-center gap-1.5 text-red-200`}><Trash2 size={14} aria-hidden="true" />{repeats ? t("deleteAll") : t("delete")}</button>
          <button type="button" onClick={onClose} className={`${btn} ml-auto`}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  );
}

function DayPanel({ day, entries, forecast, layerEvents, personal, onClose, onNew, onPick, onToggle, onOpenEvent }: { day: string; entries: Entry[]; forecast: ReturnType<typeof useForecast>; layerEvents: EventView[]; personal: CalItem[]; onClose: () => void; onNew: () => void; onPick: (e: Entry) => void; onToggle: (e: Entry) => void; onOpenEvent: (e: EventView) => void }) {
  const t = useInline(C);
  const { language } = useLanguage();
  const [fit, setFit] = useState(false);
  const w = forecast.byDate.get(day);

  // Free periods of at least two hours between 09:00 and 21:00, around the
  // visitor's own timed events.
  const fitting = useMemo(() => {
    const busy = allOccurrences(personal.filter((i) => i.kind === "event"), day, day)
      .filter((o) => o.item.startTime && !o.item.allDay)
      .map((o) => [minutesOfDay(o.item.startTime as string), o.item.endTime ? minutesOfDay(o.item.endTime) : minutesOfDay(o.item.startTime as string) + 60] as const)
      .sort((a, b) => a[0] - b[0]);
    const free: [number, number][] = [];
    let cursor = 9 * 60;
    for (const [s, e] of busy) {
      if (s - cursor >= 120) free.push([cursor, s]);
      cursor = Math.max(cursor, e);
    }
    if (21 * 60 - cursor >= 120) free.push([cursor, 21 * 60]);
    return layerEvents.filter((e) => !e.startTime || free.some(([a, b]) => minutesOfDay(e.startTime as string) >= a && minutesOfDay(e.startTime as string) < b));
  }, [personal, day, layerEvents]);

  return (
    <section aria-label={fmt(day, language, { dateStyle: "full" } as Intl.DateTimeFormatOptions)} className="rounded-2xl border border-azure/30 bg-glass-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">{fmt(day, language, { weekday: "long", month: "long", day: "numeric" })}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={onNew} className={`${btn} inline-flex items-center gap-1.5`}><Plus size={14} aria-hidden="true" />{t("newItem")}</button>
          <button type="button" onClick={onClose} className={btn}>✕</button>
        </div>
      </div>
      {w && (
        <p className="mt-1.5 text-sm text-foreground/85">
          {t("weather")}: {w.condition}, {w.low}–{w.high}°C · {w.precipProbability}% {t("chanceOfRain")} <span className="text-[11px] text-muted">({t("forecastOnly")})</span>
        </p>
      )}
      <div className="mt-2 flex flex-col gap-1">
        {entries.length === 0 ? <p className="text-sm text-muted">{t("emptyDay")}</p> : [...entries].sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")).map((e) => <Chip key={e.key} entry={e} onPick={onPick} onToggle={onToggle} />)}
      </div>
      {layerEvents.length > 0 && (
        <div className="mt-3 border-t border-glass-border pt-3">
          <button type="button" onClick={() => setFit((v) => !v)} aria-expanded={fit} className={`${btn} text-sm`}>{t("freeTime")}</button>
          {fit && (
            <ul className="mt-2 flex flex-col gap-1">
              {fitting.length === 0 ? <li className="text-sm text-muted">{t("freeTimeNone")}</li> : fitting.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => onOpenEvent(e)} className="flex w-full items-center gap-2 rounded-lg border-l-2 border-neon-purple bg-neon-purple/10 px-2 py-1.5 text-left text-sm hover:bg-neon-purple/20">
                    {e.startTime && <span className="tabular-nums text-muted">{e.startTime}</span>}
                    <span className="truncate">{e.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

