"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { C } from "@/lib/calendar/strings";
import { useCalendar } from "@/lib/calendar/store";
import { useInline } from "@/lib/i18n/inline";

const field = "min-h-11 w-full rounded-xl border border-white/20 bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";
const DEFAULTS = [null, 0, 10, 30, 60, 1440];

type Permission = "unsupported" | NotificationPermission;

function currentPermission(): Permission {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

// Reminder preferences. Browser notifications need the visitor's permission
// and only work while the site is open in a tab — the panel says so plainly.
export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const t = useInline(C);
  const cal = useCalendar();
  const s = cal.settings;
  const [permission, setPermission] = useState<Permission>(currentPermission);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") return setPermission("unsupported");
    const result = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setPermission(result);
    // Only switched on if the visitor actually granted it.
    if (result === "granted") cal.setSettings({ browserNotifications: true });
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="cal-settings" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-glass-border bg-panel p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 id="cal-settings" className="text-lg font-bold text-foreground">{t("settings")}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t("cancel")} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <section className="mt-4 space-y-2 rounded-xl border border-glass-border p-3.5" aria-labelledby="notif-h">
          <h3 id="notif-h" className="text-sm font-semibold text-foreground">{t("notifications")}</h3>
          <p className="text-xs leading-relaxed text-muted">{t("notifExplain")}</p>
          {permission === "unsupported" ? (
            <p className="text-sm text-amber-200">{t("notifUnsupported")}</p>
          ) : permission === "denied" ? (
            <p className="text-sm text-amber-200">{t("notifDenied")}</p>
          ) : s.browserNotifications && permission === "granted" ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-mint">{t("notifOn")}</span>
              <button type="button" onClick={() => cal.setSettings({ browserNotifications: false })} className="min-h-10 rounded-xl border border-glass-border px-4 text-sm font-semibold text-foreground hover:bg-white/10">{t("notifOff")}</button>
            </div>
          ) : (
            <button type="button" onClick={() => void enableNotifications()} className="min-h-11 rounded-xl bg-azure px-4 text-sm font-bold text-background hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{t("notifEnable")}</button>
          )}
        </section>

        <section className="mt-3 space-y-2 rounded-xl border border-glass-border p-3.5">
          <label className="flex min-h-10 items-center gap-2.5 text-sm font-semibold text-foreground">
            <input type="checkbox" checked={s.quietHours} onChange={(e) => cal.setSettings({ quietHours: e.target.checked })} className="h-5 w-5 accent-[var(--azure)]" />
            {t("quietHours")}
          </label>
          {s.quietHours && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                {t("start")}
                <input type="time" value={s.quietStart} onChange={(e) => e.target.value && cal.setSettings({ quietStart: e.target.value })} className={field} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                {t("end")}
                <input type="time" value={s.quietEnd} onChange={(e) => e.target.value && cal.setSettings({ quietEnd: e.target.value })} className={field} />
              </label>
            </div>
          )}
          <p className="text-[11px] text-muted">{t("quietNote")} {t("jstNote")}</p>
        </section>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            {t("defaultReminder")}
            <select value={s.defaultReminder === null ? "none" : String(s.defaultReminder)} onChange={(e) => cal.setSettings({ defaultReminder: e.target.value === "none" ? null : Number(e.target.value) })} className={field}>
              {DEFAULTS.map((m) => (
                <option key={String(m)} value={m === null ? "none" : String(m)}>
                  {m === null ? t("none") : m === 0 ? "At the time" : m < 60 ? `${m} min` : m < 1440 ? `${m / 60} h` : "1 day"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            {t("weekStart")}
            <select value={s.weekStartsOn} onChange={(e) => cal.setSettings({ weekStartsOn: Number(e.target.value) === 0 ? 0 : 1 })} className={field}>
              <option value={1}>{t("monday")}</option>
              <option value={0}>{t("sunday")}</option>
            </select>
          </label>
        </div>

        <section className="mt-3 rounded-xl border border-red-400/30 p-3.5">
          <p className="text-xs leading-relaxed text-muted">{t("storageNote")}</p>
          <button type="button" onClick={() => { if (window.confirm(t("clearConfirm"))) { cal.clearAll(); onClose(); } }} className="mt-2 min-h-10 rounded-xl border border-red-400/50 px-4 text-sm font-semibold text-red-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
            {t("clearAll")}
          </button>
        </section>
      </div>
    </div>
  );
}
