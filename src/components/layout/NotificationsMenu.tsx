"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell, BellRing } from "lucide-react";
import { dueReminders, reminderLabel } from "@/lib/calendar/reminders";
import { useCalendar } from "@/lib/calendar/store";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useInline, type Table } from "@/lib/i18n/inline";
import { ICON_BUTTON, MENU_PANEL, useDismiss } from "@/components/layout/usePopover";

const TEXT = {
  title: { en: "Notifications", ja: "通知" },
  empty: { en: "You're all caught up.", ja: "新しい通知はありません。" },
  emptyNote: {
    en: "Reminders you set in your calendar show up here while the site is open.",
    ja: "カレンダーで設定したリマインダーが、サイトを開いている間ここに表示されます。",
  },
  open: { en: "Open calendar", ja: "カレンダーを開く" },
} satisfies Table;

const SEEN_KEY = "livecity:notificationsSeen";
const SEEN_EVENT = "livecity:notificationsseen";

function subscribe(cb: () => void) {
  window.addEventListener(SEEN_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SEEN_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function seenSnapshot(): string {
  try {
    return window.localStorage.getItem(SEEN_KEY) ?? "0";
  } catch {
    return "0";
  }
}
function markSeen(at: number) {
  try {
    window.localStorage.setItem(SEEN_KEY, String(at));
  } catch {
    // Storage unavailable — the dot just reappears next time.
  }
  window.dispatchEvent(new Event(SEEN_EVENT));
}

// The bell lists real calendar reminders that have come due (and are not over
// or done). The dot shows only while there is one the visitor hasn't looked at.
export default function NotificationsMenu() {
  const { t } = useLanguage();
  const text = useInline(TEXT);
  const cal = useCalendar();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);
  const seen = Number(useSyncExternalStore(subscribe, seenSnapshot, () => "0"));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const due = useMemo(() => {
    const { fresh, earlier } = dueReminders({ ...cal.data, fired: {} }, new Date(now));
    return [...fresh, ...earlier].sort((a, b) => b.at - a.at).slice(0, 8);
  }, [cal.data, now]);
  const unread = due.some((r) => r.at > seen);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          markSeen(Date.now());
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `${t("topbar.notifications")} (${due.length})` : t("topbar.notifications")}
        title={t("topbar.notifications")}
        className={ICON_BUTTON}
      >
        <Bell size={18} aria-hidden="true" />
        {unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-azure ring-2 ring-sidebar-bg" aria-hidden="true" />}
      </button>

      {open && (
        <div role="dialog" aria-label={text("title")} className={`${MENU_PANEL} sm:w-80`}>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{text("title")}</p>
          {due.length === 0 ? (
            <div className="px-3 pb-3 pt-1">
              <p className="text-sm font-medium text-foreground">{text("empty")}</p>
              <p className="mt-1 text-xs leading-snug text-muted">{text("emptyNote")}</p>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {due.map((r) => (
                <li key={r.id}>
                  <Link
                    href="/calendar"
                    onClick={close}
                    className="flex gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-glass-bg-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
                  >
                    <BellRing size={16} className="mt-0.5 shrink-0 text-azure" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{r.item.title}</span>
                      <span className="block text-xs text-muted">
                        {reminderLabel(r.minutesBefore)}
                        {r.item.startTime ? ` · ${r.item.startTime}` : ""}
                        {r.item.location ? ` · ${r.item.location}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-1 border-t border-glass-border pt-1">
            <Link
              href="/calendar"
              onClick={close}
              className="flex min-h-10 items-center justify-center rounded-xl text-sm font-medium text-azure transition-colors hover:bg-azure/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              {text("open")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
