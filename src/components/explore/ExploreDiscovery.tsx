"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Sparkles, ExternalLink } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PLACE_CATEGORY_META, PLACE_CATEGORY_ORDER } from "@/lib/data/placeCategories";
import type { PlaceCity } from "@/lib/data/places";
import type { EnrichedPlace } from "@/lib/services/places";

const ALL_JAPAN = "__all_japan__";
const ALL_CATEGORIES = "__all_categories__";

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

const SEARCH_PROMPT_EXAMPLES = [
  "Try: a traditional Japanese experience near me…",
  "Try: something fun to do tonight…",
  "Try: hidden places in Osaka…",
  "Try: cheap things to do in Kyoto…",
];

export default function ExploreDiscovery({ places }: { places: EnrichedPlace[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string>(ALL_JAPAN);
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [surprise, setSurprise] = useState<EnrichedPlace | null>(null);

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

  function askAi(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    router.push(`/ai-assistant?q=${encodeURIComponent(trimmed)}`);
  }

  function surpriseMe() {
    if (filtered.length === 0) return;
    setSurprise(filtered[Math.floor(Math.random() * filtered.length)]);
  }

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            askAi(query);
          }}
          className="flex items-center gap-2 rounded-full border border-glass-border bg-glass-bg px-3 py-2"
        >
          <Search size={16} className="shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("explore.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t("ai.askButton")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-azure to-neon-purple text-white transition-opacity hover:opacity-90"
          >
            <Search size={14} />
          </button>
        </form>
        <p className="mt-2 truncate px-1 text-[11px] text-muted">
          {SEARCH_PROMPT_EXAMPLES[0]}
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <Tabs tabs={cityTabs} value={city} onChange={setCity} getLabel={cityLabel} />
          <Tabs tabs={categoryTabs} value={category} onChange={setCategory} getLabel={categoryLabel} />
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Sparkles size={15} className="text-neon-purple" />
              <T k="explore.surpriseMe" />
            </p>
            <p className="text-xs text-muted">
              <T k="explore.surpriseMeTagline" />
            </p>
          </div>
          <button
            type="button"
            onClick={surpriseMe}
            disabled={filtered.length === 0}
            className="shrink-0 rounded-full bg-gradient-to-br from-azure to-neon-purple px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            ✨ <T k="explore.surpriseMe" />
          </button>
        </div>

        {surprise && (
          <a
            href={surprise.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-4 flex gap-3 rounded-xl border border-glass-border bg-glass-bg p-3 transition-colors hover:border-azure/30"
          >
            <PlaceThumb place={surprise} className="h-20 w-20 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground group-hover:text-azure">
                {surprise.name}
                {surprise.nameJa && <span className="font-jp text-muted"> · {surprise.nameJa}</span>}
              </p>
              <p className="text-xs text-muted">{surprise.city}</p>
              {surprise.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted">{surprise.description}</p>
              )}
            </div>
          </a>
        )}
      </GlassCard>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">
          🗺️ <T k="explore.title" />
        </p>

        {filtered.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-sm text-muted">
              <T k="explore.noResults" />
            </p>
            <p className="mt-1 text-xs text-muted">
              <T k="explore.tryExpanding" />
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((place) => (
              <PlaceCard key={place.name} place={place} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceThumb({ place, className = "" }: { place: EnrichedPlace; className?: string }) {
  const Icon = PLACE_CATEGORY_META[place.category].icon;
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-glass-border bg-gradient-to-br ${place.gradient} bg-panel ${className}`}
    >
      {place.image ? (
        <Image src={place.image} alt={place.name} fill sizes="80px" className="object-cover" />
      ) : (
        <Icon size={16} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground/40" />
      )}
    </div>
  );
}

function PlaceCard({ place }: { place: EnrichedPlace }) {
  const { t } = useLanguage();
  const Icon = PLACE_CATEGORY_META[place.category].icon;

  return (
    <GlassCard className="flex flex-col overflow-hidden">
      <div className="relative h-36 w-full overflow-hidden">
        <Image
          src={place.image}
          alt={place.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-azure/15 px-2 py-0.5 text-[10px] font-medium text-azure">
          <Icon size={11} />
          {t(PLACE_CATEGORY_META[place.category].labelKey)}
        </span>
        <p className="text-sm font-semibold text-foreground">
          {place.name}
          {place.nameJa && <span className="font-jp font-normal text-muted"> · {place.nameJa}</span>}
        </p>
        <p className="text-xs text-gold">{place.city}</p>
        {place.description && <p className="line-clamp-2 text-xs text-muted">{place.description}</p>}
        <a
          href={place.wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center gap-1 pt-2 text-[11px] font-medium text-azure hover:underline"
        >
          <T k="explore.viewOnWikipedia" />
          <ExternalLink size={11} />
        </a>
      </div>
    </GlassCard>
  );
}
