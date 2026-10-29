"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { dueReminders, isQuietNow, reminderLabel, type DueReminder } from "@/lib/calendar/reminders";
import { useCalendar } from "@/lib/calendar/store";
import { C } from "@/lib/calendar/strings";
import { useInline } from "@/lib/i18n/inline";

// Runs on every page. While the website is open it checks every 20 seconds for
// reminders that have come due and shows them in the page. If the visitor has
// allowed browser notifications it also raises one — which, like everything
// here, only happens while the site is open in a tab. Nothing is sent to a
// server, and nothing can reach the visitor once the site is closed.
export default function ReminderHost() {
  const t = useInline(C);
  const cal = useCalendar();
  const dataRef = useRef(cal.data);
  const [toasts, setToasts] = useState<DueReminder[]>([]);

  useEffect(() => {
    dataRef.current = cal.data;
  });

  useEffect(() => {
    function check() {
      const data = dataRef.current;
      if (data.items.length === 0 || isQuietNow(data)) return;
      const { fresh } = dueReminders(data);
      if (fresh.length === 0) return;
      cal.markFired(fresh.map((r) => r.id));
      setToasts((list) => [...list, ...fresh].slice(-4));
      if (data.settings.browserNotifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const r of fresh.slice(0, 3)) {
          try {
            new Notification(r.item.title, { body: `${reminderLabel(r.minutesBefore)}${r.item.location ? ` · ${r.item.location}` : ""}`, tag: r.id });
          } catch {
            // Notifications unavailable in this context — the in-page reminder still shows.
          }
        }
      }
    }
    const first = setTimeout(check, 1500);
    const id = setInterval(check, 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [cal]);

  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[95] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" role="region" aria-label={t("reminders")} aria-live="polite">
      {toasts.map((r) => (
        <div key={r.id} className="pointer-events-auto rounded-2xl border border-azure/40 bg-panel p-3.5 shadow-2xl">
          <div className="flex items-start gap-2.5">
            <BellRing size={18} className="mt-0.5 shrink-0 text-azure" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{r.item.title}</p>
              <p className="text-xs text-muted">
                {reminderLabel(r.minutesBefore)}
                {r.item.startTime ? ` · ${r.item.startTime}` : ""}
                {r.item.location ? ` · ${r.item.location}` : ""}
              </p>
              <div className="mt-2 flex gap-2">
                <Link href="/calendar" className="min-h-9 rounded-lg bg-azure/15 px-3 py-2 text-xs font-semibold text-azure hover:bg-azure/25">
                  {t("reminderOpen")}
                </Link>
                {r.item.kind === "task" && (
                  <button type="button" onClick={() => { cal.toggleDone(r.item.id, r.date); setToasts((l) => l.filter((x) => x.id !== r.id)); }} className="min-h-9 rounded-lg border border-glass-border px-3 text-xs font-semibold text-foreground hover:bg-white/10">
                    {t("markDone")}
                  </button>
                )}
              </div>
            </div>
            <button type="button" onClick={() => setToasts((l) => l.filter((x) => x.id !== r.id))} aria-label={t("reminderDismiss")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
