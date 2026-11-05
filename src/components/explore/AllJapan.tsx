"use client";

import { Globe2 } from "lucide-react";
import { REGIONS } from "@/lib/explore/regions";
import { SEASONS, pickLabel } from "@/lib/explore/categories";
import { localize, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MAP_CITIES } from "@/lib/map/cities";
import { PREFECTURES } from "@/lib/news/places";

const SEASON_ICON: Record<string, string> = { spring: "🌸", summer: "🌻", autumn: "🍁", winter: "❄️" };

// Nationwide exploration: the eight regions with their prefectures, the main
// cities, and the seasons. Every button narrows the list above to real places.
export default function AllJapan({
  onRegion,
  onPrefecture,
  onSeason,
  onCity,
  currentSeason,
}: {
  onRegion: (id: string) => void;
  onPrefecture: (id: string) => void;
  onSeason: (id: string) => void;
  onCity: (slug: string) => void;
  currentSeason: string;
}) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const chip = "rounded-full border border-glass-border bg-glass-bg px-3 py-1.5 text-xs font-medium text-foreground/85 transition-colors hover:border-azure/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

  return (
    <section aria-labelledby="all-japan" className="flex flex-col gap-5 rounded-3xl border border-glass-border bg-glass-bg p-4 sm:p-6">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-azure/25 to-neon-purple/25 text-[#c4b5fd]">
          <Globe2 size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 id="all-japan" className="text-lg font-semibold text-foreground sm:text-xl">{tr("Explore all of Japan")}</h2>
          <p className="text-xs text-muted">{tr("All 47 prefectures in eight regions. Pick one to see its places.")}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {REGIONS.map((r) => (
          <div key={r.id} className="flex flex-col gap-2.5 rounded-2xl border border-glass-border bg-background/40 p-3.5">
            <button type="button" onClick={() => onRegion(r.id)} className="flex items-center justify-between gap-2 text-left text-sm font-semibold text-foreground hover:text-azure focus-visible:outline-none focus-visible:underline">
              {localize(r.en, r.ja, language)}
              <span className="text-[11px] font-normal text-muted">{r.prefectureIds.length}</span>
            </button>
            <div className="flex flex-wrap gap-1.5">
              {r.prefectureIds.map((id) => {
                const p = PREFECTURES.find((x) => x.id === id);
                return p ? (
                  <button key={id} type="button" onClick={() => onPrefecture(id)} className="rounded-full bg-glass-bg-strong px-2.5 py-1 text-[11px] text-foreground/80 transition-colors hover:bg-azure/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                    {localize(p.en, p.ja, language)}
                  </button>
                ) : null;
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{tr("Major cities")}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {MAP_CITIES.slice(0, 12).map((c) => (
              <button key={c.slug} type="button" onClick={() => onCity(c.slug)} className={chip}>
                {localize(c.name, c.nameJa, language)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{tr("Seasonal experiences")}</h3>
          <p className="text-[11px] text-muted">{tr("Places that are typically at their best in each season (by type of place).")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEASONS.map((s) => (
              <button key={s.id} type="button" onClick={() => onSeason(s.id)} className={`${chip} ${s.id === currentSeason ? "border-gold/50 text-gold" : ""}`}>
                <span aria-hidden="true">{SEASON_ICON[s.id]} </span>
                {pickLabel(s.label, language)}
                {s.id === currentSeason ? ` · ${tr("now")}` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
