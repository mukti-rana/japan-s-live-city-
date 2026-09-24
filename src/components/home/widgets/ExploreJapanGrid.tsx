"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import Thumb from "@/components/ui/Thumb";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PLACE_CATEGORY_META, PLACE_CATEGORY_ORDER } from "@/lib/data/placeCategories";
import type { PlaceCity } from "@/lib/data/places";
import type { EnrichedPlace } from "@/lib/services/places";

const ALL_JAPAN = "__all_japan__";
const ALL_CATEGORIES = "__all_categories__";
const WIDGET_ITEM_CAP = 6;

const CITY_TABS: PlaceCity[] = [
  "Tokyo",
  "Kyoto",
  "Osaka",
  "Nara",
  "Hiroshima",
  "Hokkaido",
  "Gifu",
  "Kanazawa",
  "Okinawa",
];

export default function ExploreJapanGrid({ places }: { places: EnrichedPlace[] }) {
  const { t } = useLanguage();
  const [city, setCity] = useState<string>(ALL_JAPAN);
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  const cityTabs = [ALL_JAPAN, ...CITY_TABS];
  const categoryTabs = [ALL_CATEGORIES, ...PLACE_CATEGORY_ORDER];

  function cityLabel(tab: string) {
    return tab === ALL_JAPAN ? t("explore.allJapan") : tab;
  }
  function categoryLabel(tab: string) {
    if (tab === ALL_CATEGORIES) return t("explore.allCategories");
    return t(PLACE_CATEGORY_META[tab as keyof typeof PLACE_CATEGORY_META].labelKey);
  }

  const filtered = useMemo(() => {
    return places.filter(
      (p) => (city === ALL_JAPAN || p.city === city) && (category === ALL_CATEGORIES || p.category === category),
    );
  }, [places, city, category]);

  function surpriseMe() {
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    window.open(pick.wikipediaUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-3">
      <Tabs tabs={cityTabs} value={city} onChange={setCity} getLabel={cityLabel} />
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Tabs tabs={categoryTabs} value={category} onChange={setCategory} getLabel={categoryLabel} />
        </div>
        <button
          type="button"
          onClick={surpriseMe}
          disabled={filtered.length === 0}
          title={t("explore.surpriseMe")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-azure to-neon-purple text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Sparkles size={13} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          <T k="explore.noResults" />
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.slice(0, WIDGET_ITEM_CAP).map((place) => (
            <a
              key={place.name}
              href={place.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group min-w-0"
            >
              <Thumb
                gradient={place.gradient}
                icon={PLACE_CATEGORY_META[place.category].icon}
                src={place.image}
                alt={place.name}
                className="h-20 w-full"
              />
              <p className="mt-1.5 truncate text-[11px] font-medium text-foreground group-hover:text-azure">
                {place.name}
              </p>
              <p className="truncate text-[9px] text-muted">{place.description ?? place.city}</p>
            </a>
          ))}
        </div>
      )}

      <Link
        href="/explore"
        className="text-center text-[11px] font-medium text-azure hover:underline"
      >
        <T k="explore.exploreAll" /> →
      </Link>
    </div>
  );
}
