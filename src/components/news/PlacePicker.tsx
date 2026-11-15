"use client";

import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PREFECTURES } from "@/lib/news/places";
import { chooseNewsPlace, type NewsPlace } from "@/lib/news/useNews";
import { known, localize, translate, useTranslate } from "@/lib/i18n/inline";

const POPULAR = ["Tokyo", "Osaka", "Kyoto", "Nagoya", "Kobe", "Fukuoka", "Sapporo", "Hiroshima", "Sendai", "Nara"];

// Lets the visitor say where they are, by name. Shown whenever the browser's
// location hasn't given us a Japanese city (declined, unavailable, abroad),
// and any time they want to change it. It never blocks the rest of the site.
export default function PlacePicker({ current, compact = false }: { current: NewsPlace; compact?: boolean }) {
  const { t, language } = useLanguage();
  const tr = useTranslate();
  const [changing, setChanging] = useState(false);

  if (current.place && !changing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <MapPin size={14} className="text-gold" aria-hidden="true" />
        <span className="font-semibold text-foreground">{known(current.place, language)}</span>
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
          {current.source === "selected" ? t("news.place.selected") : t("news.place.fromLocation")}
        </span>
        <button
          type="button"
          onClick={() => setChanging(true)}
          className="font-medium text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          {t("news.place.change")}
        </button>
      </div>
    );
  }

  function choose(name: string) {
    chooseNewsPlace(name);
    setChanging(false);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground/85">
        <MapPin size={14} className="text-gold" aria-hidden="true" />
        {t("news.place.choose")}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {POPULAR.slice(0, compact ? 6 : POPULAR.length).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => choose(name)}
            className="rounded-full border border-glass-border bg-glass-bg px-3 py-1.5 text-xs text-foreground/85 transition-colors hover:border-gold/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
          >
            {translate(name, language)}
          </button>
        ))}
        <select
          aria-label={t("news.place.more")}
          value=""
          onChange={(e) => e.target.value && choose(e.target.value)}
          className="rounded-full border border-glass-border bg-panel px-3 py-1.5 text-xs text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          <option value="">{t("news.place.more")}</option>
          {PREFECTURES.map((p) => (
            <option key={p.id} value={p.en}>
              {localize(p.en, p.ja, language)}
            </option>
          ))}
        </select>
        {/* 32px visual to match the chips and select beside it; the ::after
            overlay is out of flow and carries the 44px touch target. */}
        {changing && (
          <button
            type="button"
            onClick={() => setChanging(false)}
            aria-label={tr("Close")}
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted">{t("news.place.privacy")}</p>
    </div>
  );
}
