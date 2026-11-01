"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarCheck, CloudSun, Sparkles } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { addDays } from "@/lib/calendar/dates";
import { allOccurrences } from "@/lib/calendar/recurrence";
import { reminderLabel } from "@/lib/calendar/reminders";
import { useCalendar } from "@/lib/calendar/store";
import { C } from "@/lib/calendar/strings";
import { useEventsToday, useForecast, useHolidays } from "@/lib/calendar/useExternal";
import { jstDate } from "@/lib/events/time";
import { useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { resolvePlace } from "@/lib/news/places";
import { useNewsPlace } from "@/lib/news/useNews";

// A short "what's today" for the Home page. The schedule, tasks and reminders
// come straight from this device and appear at once; the weather, holiday and
// local events fill in afterwards, and any that can't load are simply left out.
export default function YourDay() {
  const t = useInline(C);
  const { language } = useLanguage();
  const cal = useCalendar();
  const placeInfo = useNewsPlace();
  const today = jstDate();
  const [text, setText] = useState("");

  const prefectureId = resolvePlace(placeInfo.place)?.prefectureId ?? null;
  const forecast = useForecast(prefectureId);
  const holidays = useHolidays(true);
  const local = useEventsToday(placeInfo.place, today);

  const { schedule, tasks, soon } = useMemo(() => {
    const todays = allOccurrences(cal.items, today, today);
    const week = allOccurrences(cal.items.filter((i) => i.kind === "task"), today, addDays(today, 7)).filter((o) => !o.done);
    return {
      schedule: todays.filter((o) => o.item.kind === "event").sort((a, b) => (a.item.startTime ?? "00:00").localeCompare(b.item.startTime ?? "00:00")),
      tasks: [...cal.items.filter((i) => i.kind === "task" && !i.done && i.recurrence.freq === "none" && i.date && i.date < today).map((i) => ({ item: i, date: i.date as string, overdue: true })), ...todays.filter((o) => o.item.kind === "task" && !o.done).map((o) => ({ item: o.item, date: o.date, overdue: false }))],
      soon: week.filter((o) => o.date > today).slice(0, 3),
    };
  }, [cal.items, today]);

  // "Now", refreshed each minute so the reminder list stays current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reminders still to come in the next 24 hours.
  const upcoming = useMemo(() => {
    const out: { title: string; label: string; at: number }[] = [];
    for (const o of allOccurrences(cal.items, today, addDays(today, 1))) {
      if (o.done || o.item.reminders.length === 0) continue;
      const time = o.item.startTime && !o.item.allDay ? o.item.startTime : "09:00";
      const start = new Date(`${o.date}T${time}:00+09:00`).getTime();
      for (const m of o.item.reminders) {
        const at = start - m * 60_000;
        if (at > now && at < now + 24 * 3600_000 && !cal.data.fired[`${o.item.id}@${o.date}#${m}`]) out.push({ title: o.item.title, label: reminderLabel(m), at });
      }
    }
    return out.sort((a, b) => a.at - b.at).slice(0, 3);
  }, [cal.items, cal.data.fired, today, now]);

  const holiday = holidays.map.get(today);
  // Only today's own forecast — never another day's standing in for it.
  const w = forecast.byDate.get(today);
  const rainy = w && w.precipProbability >= 50;
  const hhmm = (ms: number) => new Intl.DateTimeFormat(language, { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }).format(ms);

  // A one-line summary built only from facts we actually have.
  const parts: string[] = [];
  if (holiday) parts.push(language === "ja" ? `今日は${holiday.name}です。` : `Today is a public holiday: ${holiday.nameEn ?? holiday.name}.`);
  if (schedule.length) parts.push(language === "ja" ? `予定は${schedule.length}件。最初は${schedule[0].item.startTime ? `${schedule[0].item.startTime}の` : ""}「${schedule[0].item.title}」です。` : `${schedule.length} event${schedule.length === 1 ? "" : "s"} today${schedule[0].item.startTime ? `, first at ${schedule[0].item.startTime}` : ""}.`);
  if (tasks.length) parts.push(language === "ja" ? `未完了のタスクが${tasks.length}件あります。` : `${tasks.length} open task${tasks.length === 1 ? "" : "s"}${tasks.some((x) => x.overdue) ? " (some overdue)" : ""}.`);
  if (rainy) parts.push(language === "ja" ? `降水確率は${w.precipProbability}%です（予報）。` : `Rain is forecast (${w.precipProbability}%).`);
  const empty = schedule.length === 0 && tasks.length === 0;

  return (
    <WidgetFrame icon={CalendarCheck} labelKey="nav.calendar" accent="azure" viewAll viewAllHref="/calendar">
      <div className="-mt-1 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">{t("yourDay")}</h2>
      </div>

      {parts.length > 0 && <p className="rounded-xl bg-azure/10 p-2.5 text-sm text-foreground/90">{parts.join(" ")}</p>}

      {w && (
        <p className="flex items-center gap-2 text-sm text-foreground/85">
          <CloudSun size={15} className="text-azure" aria-hidden="true" />
          {w.condition}, {w.low}–{w.high}°C · {w.precipProbability}% {t("chanceOfRain")}
        </p>
      )}

      {empty ? (
        <p className="text-sm text-muted">{t("nothingPlanned")}</p>
      ) : (
        <>
          {schedule.length > 0 && (
            <section aria-label={t("scheduleToday")}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("scheduleToday")}</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {schedule.slice(0, 4).map((o) => (
                  <li key={o.key} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="w-12 shrink-0 tabular-nums text-muted">{o.item.startTime && !o.item.allDay ? o.item.startTime : t("allDay")}</span>
                    <span className="truncate">{o.item.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(tasks.length > 0 || soon.length > 0) && (
            <section aria-label={t("tasksDue")}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("tasksDue")}</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {tasks.slice(0, 3).map((x) => (
                  <li key={x.item.id + x.date} className="flex items-center gap-2 text-sm">
                    <button type="button" role="checkbox" aria-checked="false" aria-label={`${t("markDone")}: ${x.item.title}`} onClick={() => cal.toggleDone(x.item.id, x.date)} className="h-5 w-5 shrink-0 rounded border border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure" />
                    <span className={`truncate ${x.overdue ? "text-red-300" : "text-foreground"}`}>{x.item.title}</span>
                  </li>
                ))}
                {soon.map((o) => (
                  <li key={o.key} className="truncate text-sm text-foreground/75">
                    {new Intl.DateTimeFormat(language, { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(`${o.date}T00:00:00Z`))} · {o.item.title}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {upcoming.length > 0 && (
        <section aria-label={t("upcomingReminders")}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("upcomingReminders")}</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {upcoming.map((r) => (
              <li key={r.title + r.at} className="flex items-center gap-2 text-sm text-foreground/85">
                <BellRing size={13} className="shrink-0 text-gold" aria-hidden="true" />
                <span className="tabular-nums text-muted">{hhmm(r.at)}</span>
                <span className="truncate">{r.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {local.events.length > 0 && (
        <section aria-label={t("localEventsToday")}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("localEventsToday")}</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {local.events.slice(0, 2).map((e) => (
              <li key={e.id} className="truncate border-l-2 border-neon-purple pl-2 text-sm text-foreground/85">
                {e.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      <form action="/calendar" className="mt-auto flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t("quickAdd")}</span>
          <Sparkles size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-neon-purple" aria-hidden="true" />
          <input name="quick" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("addSomething")} className="h-10 w-full rounded-xl border border-glass-border bg-panel pl-9 pr-3 text-base text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure sm:text-sm" />
        </label>
        <button type="submit" disabled={!text.trim()} className="min-h-10 rounded-xl border border-glass-border px-3 text-sm font-semibold text-foreground hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          {t("quickReview")}
        </button>
      </form>
    </WidgetFrame>
  );
}
