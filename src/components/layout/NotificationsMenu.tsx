"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell, BellRing } from "lucide-react";
import { dueReminders, reminderLabel } from "@/lib/calendar/reminders";
import { useCalendar } from "@/lib/calendar/store";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CommunityNotificationList, useCommunityNotifications } from "@/components/community/CommunityNotifications";
import { useInline, type Table } from "@/lib/i18n/inline";
import { useAuth } from "@/lib/supabase/AuthContext";
import TypedPrompt from "@/components/layout/TypedPrompt";
import { ICON_BUTTON, MENU_PANEL, useDismiss, useHoverMenu } from "@/components/layout/usePopover";

const TEXT = {
  title: { en: "Notifications", ja: "通知" },
  empty: { en: "You're all caught up.", ja: "新しい通知はありません。" },
  community: { en: "Community", ja: "コミュニティ" },
  reminders: { en: "Reminders", ja: "リマインダー" },
  emptyNote: {
    en: "Reminders you set in your calendar show up here while the site is open.",
    ja: "カレンダーで設定したリマインダーが、サイトを開いている間ここに表示されます。",
  },
  open: { en: "Open calendar", ja: "カレンダーを開く" },
  loginNotify: { en: "Log in to get notifications about Japan", ja: "ログインして日本の通知を受け取ろう" },
  loginExplore: { en: "Log in to explore Japan", ja: "ログインして日本を探検しよう" },
  loginMore: { en: "If you want to explore more and get alert notifications about Japan, please log in.", ja: "もっと日本を探検して、日本のアラート通知を受け取りたい方は、ログインしてください。" },
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
  const community = useCommunityNotifications();
  const { user, loading: authLoading } = useAuth();
  const guest = !authLoading && !user;
  // Opening (by pointing or by a click) marks what is there as seen and looks for anything new; what was unread is
  // marked read once it has been on screen a moment.
  const onOpen = useCallback(() => {
    markSeen(Date.now());
    void community.refresh();
    if (community.unread > 0) window.setTimeout(() => void community.markAllRead(), 1500);
  }, [community]);
  const menu = useHoverMenu(open, setOpen, onOpen);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const due = useMemo(() => {
    const { fresh, earlier } = dueReminders({ ...cal.data, fired: {} }, new Date(now));
    return [...fresh, ...earlier].sort((a, b) => b.at - a.at).slice(0, 8);
  }, [cal.data, now]);
  const unread = due.some((r) => r.at > seen) || community.unread > 0;
  const count = due.length + community.unread;

  return (
    <div ref={ref} className="relative" {...menu.hover}>
      <button
        type="button"
        onClick={menu.toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `${t("topbar.notifications")} (${count})` : t("topbar.notifications")}
        title={t("topbar.notifications")}
        className={ICON_BUTTON}
      >
        <Bell size={18} aria-hidden="true" />
        {unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-azure ring-2 ring-sidebar-bg" aria-hidden="true" />}
      </button>

      {open && (
        <div role="dialog" aria-label={text("title")} className={`${MENU_PANEL} hm-bell sm:w-80`}>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{text("title")}</p>
          {guest && (
            <div className="px-3 pb-2 pt-1">
              <TypedPrompt messages={[text("loginMore"), text("loginNotify"), text("loginExplore")]} />
            </div>
          )}
          {community.items.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{text("community")}</p>
              <CommunityNotificationList items={community.items} onNavigate={close} />
            </>
          )}
          {community.items.length > 0 && due.length > 0 && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{text("reminders")}</p>}
          {due.length === 0 && (community.items.length > 0 || guest) ? null : due.length === 0 ? (
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
          {/* A guest with nothing due sees only the typed message: no "all caught up" text and no calendar link. */}
          {!(guest && due.length === 0) && (
            <div className="mt-1 border-t border-glass-border pt-1">
              <Link
                href="/calendar"
                onClick={close}
                className="flex min-h-10 items-center justify-center rounded-xl text-sm font-medium text-azure transition-colors hover:bg-azure/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
              >
                {text("open")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
