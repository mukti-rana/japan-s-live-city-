"use client";

import { E } from "@/lib/emergency/strings";
import { pickJaEn, useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const JUMPS = [
  ["#numbers", { en: "Emergency numbers", ja: "緊急通報" }],
  ["#medical", { en: "Medical & safety help", ja: "医療・安全" }],
  ["#visitors", { en: "Visitor support", ja: "訪日支援" }],
  ["#info", { en: "Useful information", ja: "役立つ情報" }],
] as const;

export default function EmergencyHeader() {
  const t = useInline(E);
  const { language } = useLanguage();
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-foreground/80">{t("subtitle")}</p>
      <nav aria-label={t("title")} className="mt-3 flex flex-wrap gap-2">
        {JUMPS.map(([href, label]) => (
          <a key={href} href={href} className="min-h-10 rounded-full border border-glass-border bg-glass-bg px-4 py-2 text-sm font-medium text-foreground/90 transition-colors hover:border-azure/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {pickJaEn(label, language)}
          </a>
        ))}
      </nav>
    </header>
  );
}
