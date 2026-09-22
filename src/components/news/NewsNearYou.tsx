"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { HERO_CITIES, type HeroCityInfo } from "@/lib/data/heroCities";
import { formatRelativeTime } from "@/lib/format";
import type { NewsItem } from "@/lib/services/news";

const MATCH_LIMIT = 5;

// A smaller, personalized slice of the same real nationwide feed — never a
// replacement for it. Matching is a plain case-insensitive substring check
// of the resolved city name against each real headline/summary, so it only
// ever surfaces stories that genuinely mention the place — no separate
// local-news source, no invented local content.
export default function NewsNearYou({ items }: { items: NewsItem[] }) {
  const { t } = useLanguage();
  const { status, location } = useLiveLocation();
  const [manualCity, setManualCity] = useState<HeroCityInfo | null>(null);

  const isLoadingLocation = status === "idle" || status === "locating";
  const liveCityName = status === "ready" ? location?.name ?? null : null;
  const cityName = liveCityName ?? manualCity?.name ?? null;
  const needsPicker = !isLoadingLocation && !cityName;

  const matches = useMemo(() => {
    if (!cityName) return [];
    const needle = cityName.toLowerCase();
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(needle) ||
          item.summary?.toLowerCase().includes(needle),
      )
      .slice(0, MATCH_LIMIT);
  }, [items, cityName]);

  return (
    <GlassCard className="p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <MapPin size={17} />
        </div>
        <p className="text-sm font-semibold text-foreground">
          📍 <T k="news.nearYou" />
        </p>
      </div>

      {isLoadingLocation && (
        <div className="h-16 animate-pulse rounded-lg bg-glass-bg-strong" />
      )}

      {needsPicker && (
        <div>
          <p className="text-xs text-muted">
            <T k="hero.chooseCity" />
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {HERO_CITIES.map((city) => (
              <button
                key={city.slug}
                type="button"
                onClick={() => setManualCity(city)}
                className="rounded-full border border-glass-border bg-glass-bg px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-gold/40 hover:text-foreground"
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {cityName && (
        <>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs text-muted">
            <span className="font-medium text-foreground/80">{cityName}</span>
            {manualCity && (
              <>
                <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">
                  {t("hero.selected")}
                </span>
                <button
                  type="button"
                  onClick={() => setManualCity(null)}
                  className="text-azure hover:underline"
                >
                  <T k="hero.changeCity" />
                </button>
              </>
            )}
          </p>

          {matches.length === 0 ? (
            <p className="text-xs text-muted">
              <T k="news.nearYouEmpty" />
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {matches.map((item) => (
                <li key={item.link}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <p className="text-[11px] text-muted">
                      {item.source} <span className="text-glass-border">·</span>{" "}
                      {formatRelativeTime(item.publishedAt)}
                    </p>
                    <p
                      className={`text-xs font-medium leading-snug text-foreground group-hover:text-azure ${
                        item.language === "ja" ? "font-jp" : ""
                      }`}
                    >
                      {item.title}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </GlassCard>
  );
}
