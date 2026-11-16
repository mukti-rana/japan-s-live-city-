"use client";

import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { QUICK_NUMBERS } from "@/lib/emergency/content";
import { pickJaEn, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-black";

// The three emergency numbers, always one tap away on a phone, with the Emergency
// Center behind them. Same numbers and labels as the emergency card above.
export default function SafetyStrip() {
  const { language } = useLanguage();
  const tr = useTranslate();
  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {QUICK_NUMBERS.map((q) => (
          <li key={q.id}>
            <a href={`tel:${q.number}`} aria-label={`${tr("Call")}: ${q.number} — ${pickJaEn(q.label, language)}`} className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface-1 px-4 py-4 text-center transition-colors hover:border-line-strong ${ring}`}>
              <span className="flex items-center gap-2 font-[family-name:var(--font-home-serif)] text-4xl leading-none text-white tabular-nums">
                <PhoneCall size={18} aria-hidden="true" className="text-danger" />
                {q.number}
              </span>
              <span className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{pickJaEn(q.label, language)}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-text-secondary">
        <Link href="/emergency" className={`inline-flex min-h-11 items-center rounded text-azure hover:underline ${ring}`}>
          {tr("Open the Emergency Center")} →
        </Link>
      </p>
    </div>
  );
}
