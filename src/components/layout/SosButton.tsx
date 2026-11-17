"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import EmergencyQuickPanel from "@/components/emergency/EmergencyQuickPanel";
import { QUICK_NUMBERS } from "@/lib/emergency/content";
import { E } from "@/lib/emergency/strings";
import { pickJaEn, useInline, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MENU_PANEL, useDismiss, useHoverMenu } from "@/components/layout/usePopover";

const TEXT = {
  hint: { en: "Click for the Call buttons and details.", ja: "クリックすると発信ボタンと詳細が開きます。" },
  center: { en: "Open the Emergency Center", ja: "緊急センターを開く" },
} satisfies Table;

// The red SOS icon in the header. Pointing at it slides out the three emergency numbers (110, 119, 118) with no
// click; clicking it opens the full quick-access dialog (the Call buttons, as before).
export default function SosButton() {
  const { language } = useLanguage();
  const e = useInline(E);
  const text = useInline(TEXT);
  const [flyout, setFlyout] = useState(false);
  const [dialog, setDialog] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeFlyout = useCallback(() => setFlyout(false), []);
  useDismiss(flyout, closeFlyout, ref);
  const menu = useHoverMenu(flyout, setFlyout);

  return (
    <div ref={ref} className="relative" {...menu.hover}>
      <button
        type="button"
        onClick={() => {
          setFlyout(false);
          setDialog(true);
        }}
        aria-haspopup="dialog"
        aria-label={e("title")}
        title={e("title")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors duration-200 hover:bg-red-500/15 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:bg-red-500/25"
      >
        <ShieldAlert size={20} aria-hidden="true" />
        <span className="sr-only">{e("sos")}</span>
      </button>

      {flyout && (
        <div role="group" aria-label={e("title")} className={`${MENU_PANEL} hm-sos hidden sm:block sm:w-72`}>
          <p className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-red-300">{e("title")}</p>
          <ul>
            {QUICK_NUMBERS.map((n, i) => (
              <li key={n.id} className="hm-sos-row flex items-center gap-3 rounded-xl px-3 py-2" style={{ "--n": i } as React.CSSProperties}>
                <span className="w-12 text-2xl font-bold tabular-nums leading-none text-foreground">{n.number}</span>
                <span className="text-sm font-medium text-foreground/90">{pickJaEn(n.label, language)}</span>
              </li>
            ))}
          </ul>
          <p className="px-3 pb-1 pt-1.5 text-xs leading-snug text-muted">{text("hint")}</p>
          <div className="mt-1 border-t border-glass-border pt-1">
            <Link
              href="/emergency"
              onClick={closeFlyout}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-azure transition-colors hover:bg-azure/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              {text("center")}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {dialog && <EmergencyQuickPanel onClose={() => setDialog(false)} />}
    </div>
  );
}
