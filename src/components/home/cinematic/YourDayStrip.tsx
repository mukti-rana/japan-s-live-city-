"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import YourDay from "@/components/calendar/YourDay";
import { allOccurrences } from "@/lib/calendar/recurrence";
import { useCalendar } from "@/lib/calendar/store";
import { C } from "@/lib/calendar/strings";
import { useEventsToday, useForecast, useHolidays } from "@/lib/calendar/useExternal";
import { jstDate } from "@/lib/events/time";
import { known, translate, useInline, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { resolvePlace } from "@/lib/news/places";
import { useNewsPlace } from "@/lib/news/useNews";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-black";

// "Your day", small: one calm line built only from facts this device and the live
// sources actually have (the same ones the full Your Day card uses), a quick-add
// box, and a button that opens the full card — schedule, tasks, reminders and local
// events — right underneath. Nothing is lost; it just doesn't take the page.
export default function YourDayStrip() {
  const t = useInline(C);
  const tr = useTranslate();
  const { language } = useLanguage();
  const cal = useCalendar();
  const placeInfo = useNewsPlace();
  const today = jstDate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const prefectureId = resolvePlace(placeInfo.place)?.prefectureId ?? null;
  const forecast = useForecast(prefectureId);
  const holidays = useHolidays(true);
  const local = useEventsToday(placeInfo.place, today);

  const { schedule, tasks } = useMemo(() => {
    const todays = allOccurrences(cal.items, today, today);
    return {
      schedule: todays.filter((o) => o.item.kind === "event").sort((a, b) => (a.item.startTime ?? "00:00").localeCompare(b.item.startTime ?? "00:00")),
      tasks: [
        ...cal.items.filter((i) => i.kind === "task" && !i.done && i.recurrence.freq === "none" && i.date && i.date < today).map((i) => ({ overdue: true, i })),
        ...todays.filter((o) => o.item.kind === "task" && !o.done).map((o) => ({ overdue: false, i: o.item })),
      ],
    };
  }, [cal.items, today]);

  const holiday = holidays.map.get(today);
  // Only today's own forecast — never another day's standing in for it.
  const w = forecast.byDate.get(today);
  const rainy = w && w.precipProbability >= 50;

  const parts: string[] = [];
  if (holiday) parts.push(language === "ja" ? `今日は${holiday.name}です。` : translate("Today is a public holiday: {name}.", language).replace("{name}", holiday.nameEn ? known(holiday.nameEn, language) : holiday.name));
  if (schedule.length) parts.push(language === "ja" ? `予定は${schedule.length}件。` : `${schedule.length} event${schedule.length === 1 ? "" : "s"} today${schedule[0].item.startTime ? `, first at ${schedule[0].item.startTime}` : ""}.`);
  if (tasks.length) parts.push(language === "ja" ? `未完了のタスクが${tasks.length}件あります。` : `${tasks.length} open task${tasks.length === 1 ? "" : "s"}${tasks.some((x) => x.overdue) ? " (some overdue)" : ""}.`);
  if (rainy) parts.push(language === "ja" ? `降水確率は${w.precipProbability}%です（予報）。` : `Rain is forecast (${w.precipProbability}%).`);
  if (local.events.length) parts.push(language === "ja" ? `地域のイベントが${local.events.length}件あります。` : `${local.events.length} local event${local.events.length === 1 ? "" : "s"} today.`);

  return (
    <section id="your-day" aria-labelledby="your-day-h" className="border-y border-line bg-surface-1">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-[clamp(16px,4vw,48px)] py-4">
        <h2 id="your-day-h" className="font-[family-name:var(--font-home-serif)] text-xl font-normal text-foreground">
          {t("yourDay")}
        </h2>
        <p className="min-w-0 flex-[1_1_16rem] text-sm leading-relaxed text-text-secondary">
          {parts.length > 0 ? parts.join(" ") : t("nothingPlanned")}
          {w ? ` ${translate(w.condition, language)}, ${w.low}–${w.high}°C.` : ""}
        </p>
        <form action="/calendar" className="hidden md:block">
          <label className="sr-only" htmlFor="home-quick-add">
            {t("quickAdd")}
          </label>
          <input id="home-quick-add" name="quick" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("addSomething")} className={`h-10 w-56 rounded-lg border border-line bg-surface-0 px-3 text-sm text-foreground outline-none placeholder:text-text-tertiary focus:border-line-strong ${ring}`} />
        </form>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="your-day-details" className={`inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-text-secondary transition-colors hover:text-white ${ring}`}>
          {open ? tr("Hide details") : tr("Show details")}
          <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <Link href="/calendar" className={`inline-flex h-11 items-center rounded-lg px-2 text-sm text-azure hover:underline ${ring}`}>
          {tr("Open calendar")} →
        </Link>
      </div>
      {open && (
        <div id="your-day-details" className="mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,48px)] pb-6">
          <div className="max-w-xl">
            <YourDay />
          </div>
        </div>
      )}
    </section>
  );
}
