"use client";

import { E } from "@/lib/emergency/strings";
import { pickJaEn, useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const JUMPS = [
  ["#numbers", { en: "Numbers", ja: "番号" }],
  ["#alerts", { en: "Official alerts", ja: "公的な警報" }],
  ["#nearby", { en: "Nearby help", ja: "近くの施設" }],
  ["#guidance", { en: "What to do", ja: "対処法" }],
  ["#phrases", { en: "Phrases", ja: "フレーズ" }],
  ["#readiness", { en: "Readiness card", ja: "防災メモ" }],
] as const;

export default function EmergencyHeader() {
  const t = useInline(E);
  const { language } = useLanguage();
  return (
    <header>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-foreground/80">{t("subtitle")}</p>
      <nav aria-label={t("title")} className="mt-3 flex flex-wrap gap-2">
        {JUMPS.map(([href, label]) => (
          <a key={href} href={href} className="min-h-10 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-foreground/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {pickJaEn(label, language)}
          </a>
        ))}
      </nav>
    </header>
  );
}
