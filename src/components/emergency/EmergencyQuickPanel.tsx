"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Anchor, Ambulance, ArrowRight, PhoneCall, ShieldAlert, X } from "lucide-react";
import { QUICK_NUMBERS } from "@/lib/emergency/content";
import { E } from "@/lib/emergency/strings";
import { pickJaEn, useInline, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ICONS = { police: ShieldAlert, fire: Ambulance, coastguard: Anchor };

const TEXT = {
  heading: { en: "Emergency quick access", ja: "緊急連絡先" },
  lead: {
    en: "Free, answered 24 hours a day, from any phone. Pressing Call opens your phone app — nothing is dialled until you confirm there.",
    ja: "無料・24時間・どの電話からでもつながります。「発信」を押すと電話アプリが開きます。そこで確認するまで発信はされません。",
  },
  desktop: {
    en: "On a computer the Call buttons may do nothing. Pick up your phone and dial the number.",
    ja: "パソコンでは発信ボタンが動作しないことがあります。お手持ちの電話から番号をダイヤルしてください。",
  },
  center: { en: "Open the Emergency Center", ja: "緊急センターを開く" },
} satisfies Table;

// True on a phone or tablet, where a tel: link opens the dialler.
function subscribe(callback: () => void) {
  const query = window.matchMedia("(hover: none) and (pointer: coarse)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const isTouch = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;

export default function EmergencyQuickPanel({ onClose }: { onClose: () => void }) {
  const { language } = useLanguage();
  const t = useInline(E);
  const text = useInline(TEXT);
  const touch = useSyncExternalStore(subscribe, isTouch, () => false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      // Keep Tab inside the dialog.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-title"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border border-glass-border bg-panel p-5 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300 ring-1 ring-red-400/30">
              <ShieldAlert size={20} aria-hidden="true" />
            </span>
            <h2 id="sos-title" className="text-lg font-semibold text-foreground">
              {text("heading")}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-glass-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-foreground/75">{text("lead")}</p>

        <ul className="mt-4 flex flex-col gap-2.5">
          {QUICK_NUMBERS.map((n) => {
            const Icon = ICONS[n.id];
            const label = pickJaEn(n.label, language);
            return (
              <li key={n.id} className="flex items-center gap-3 rounded-2xl border border-glass-border bg-glass-bg p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/12 text-red-300">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-2xl font-bold tabular-nums leading-none text-foreground">{n.number}</span>
                    <span className="text-sm font-semibold text-foreground/90">{label}</span>
                  </p>
                  <p className="mt-1 text-xs leading-snug text-muted">{pickJaEn(n.short, language)}</p>
                </div>
                <a
                  href={`tel:${n.number}`}
                  aria-label={`${t("call")} ${n.number} — ${label}`}
                  className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-red-700"
                >
                  <PhoneCall size={15} aria-hidden="true" />
                  {t("call")}
                </a>
              </li>
            );
          })}
        </ul>

        {!touch && (
          <p className="mt-3 rounded-xl border border-glass-border bg-glass-bg px-3 py-2 text-xs leading-relaxed text-foreground/80">
            {text("desktop")}
          </p>
        )}

        <Link
          href="/emergency"
          onClick={onClose}
          className="mt-4 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-glass-border text-sm font-medium text-azure transition-colors hover:border-azure/40 hover:bg-azure/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          {text("center")}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>,
    document.body,
  );
}
