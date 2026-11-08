"use client";

import { useState, useSyncExternalStore } from "react";
import { Clapperboard, Cpu, Flame, Landmark, MapPin, Newspaper, PartyPopper, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import type { RadarTopic, TrendCategory, TrendRadarData, TrendStatus } from "@/lib/services/trendRadar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";

// What the Trend Radar's numbers are: how many times each Japanese Wikipedia
// article was opened during one UTC day. That is "article interest", not
// social-media talk, news coverage or search volume, and the wording
// everywhere says so.

export const CATEGORIES: { id: "all" | TrendCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "news", label: "Japan News" },
  { id: "entertainment", label: "Entertainment" },
  { id: "anime", label: "Anime & Manga" },
  { id: "sports", label: "Sports" },
  { id: "tech", label: "Technology & AI" },
  { id: "travel", label: "Travel & Culture" },
  { id: "local", label: "Local Trends" },
  { id: "festival", label: "Festivals & Events" },
];
export const CATEGORY_LABEL = new Map(CATEGORIES.map((c) => [c.id, c.label]));

export const STATUS_LABEL: Record<TrendStatus, string> = { new: "New", rising: "Rising", popular: "Popular" };
export const STATUS_TONE: Record<TrendStatus, string> = { new: "bg-mint/15 text-mint", rising: "bg-sakura/15 text-sakura", popular: "bg-gold/15 text-gold" };

const ICON: Record<TrendCategory | "none", LucideIcon> = { news: Newspaper, local: MapPin, anime: Sparkles, tech: Cpu, sports: Trophy, entertainment: Clapperboard, travel: Landmark, festival: PartyPopper, none: Flame };
const TONE: Record<TrendCategory | "none", [string, string]> = {
  news: ["#17214a", "#1d3566"],
  local: ["#15304a", "#1b4a5a"],
  anime: ["#2a1659", "#4a1d73"],
  tech: ["#122a4d", "#1a3f77"],
  sports: ["#17331f", "#1d4a35"],
  entertainment: ["#3a1450", "#5a1f63"],
  travel: ["#40250f", "#5a3416"],
  festival: ["#4a1730", "#6a2038"],
  none: ["#16204a", "#2a1459"],
};

// The current time, to the minute. It is 0 on the server and while the page
// hydrates (so server and browser markup agree) and the real time after that;
// anything that shows "N min ago" should show nothing while it is 0.
const subscribeMinute = (cb: () => void) => {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
};
export function useNow(): number {
  return useSyncExternalStore(subscribeMinute, () => Math.floor(Date.now() / 60_000) * 60_000, () => 0);
}

export const viewsShort = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1000)}K` : String(n));

export function ago(ms: number, tr: (s: string) => string): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 2) return tr("just now");
  if (mins < 60) return tr("{n} min ago").replace("{n}", String(mins));
  const hours = Math.round(mins / 60);
  return hours < 48 ? tr("{n} h ago").replace("{n}", String(hours)) : tr("{n} days ago").replace("{n}", String(Math.round(hours / 24)));
}

// The words used on every trend card, in the reader's language where Wikipedia has them.
export function useTrendText() {
  const tr = useTranslate();
  const { language } = useLanguage();
  return {
    title(t: RadarTopic): { title: string; original: string | null } {
      const local = language === "ja" ? null : t.names[language];
      return local ? { title: local, original: t.title } : { title: t.title, original: null };
    },
    // Wikipedia's own introduction; which language it is in is reported so the card can say so.
    explanation(t: RadarTopic): { text: string | null; lang: "ja" | "en" | null } {
      const ja = t.summary.ja ?? t.description;
      const en = t.summary.en;
      if (language === "ja") return ja ? { text: ja, lang: "ja" } : { text: null, lang: null };
      if (en) return { text: en, lang: "en" };
      return ja ? { text: ja, lang: "ja" } : { text: null, lang: null };
    },
    why(data: TrendRadarData): string {
      return tr("One of the most viewed Japanese Wikipedia articles on {date} (UTC).").replace("{date}", data.dataDate);
    },
    rank(t: RadarTopic): string {
      return tr("Ranked #{n} by page views").replace("{n}", String(t.rank));
    },
    // A real comparison with the previous day, or null when none is available.
    change(t: RadarTopic, data: TrendRadarData): string | null {
      if (t.previous) {
        const pct = Math.round((t.views / t.previous.views - 1) * 100);
        return pct >= 0 ? tr("Page views up {n}% from the previous day").replace("{n}", String(pct)) : tr("Page views down {n}% from the previous day").replace("{n}", String(-pct));
      }
      return data.previousDate ? tr("Not in the previous day's top 1,000 articles") : null;
    },
    views(t: RadarTopic): string {
      return tr("{n} page views").replace("{n}", viewsShort(t.views));
    },
    measured(data: TrendRadarData): string {
      return tr("Measured: {date} (UTC day)").replace("{date}", data.dataDate);
    },
    retrieved(data: TrendRadarData, now: number): string {
      if (!now) return "";
      return tr("Retrieved {ago}").replace("{ago}", ago(now - data.fetchedAt, tr));
    },
  };
}

// A topic's picture, framed so the subject stays in view:
//  · landscape pictures fill the frame, anchored a little above centre where
//    faces and heads usually are;
//  · portrait and square-ish pictures are shown whole, never stretched or
//    cropped, over a soft blurred copy of themselves;
//  · with no picture (or one that fails to load) a plain category-coloured
//    panel is shown — never someone else's photo.
export function TrendImage({ topic, alt, className = "", priority = false }: { topic: RadarTopic; alt: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const img = topic.image;
  const key = topic.category ?? "none";
  if (!img || failed) {
    const Icon = ICON[key];
    const [a, b] = TONE[key];
    return (
      <div role="img" aria-label={alt} className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
        <Icon size={44} strokeWidth={1.2} className="text-white/35" aria-hidden="true" />
      </div>
    );
  }
  const ratio = img.width / img.height;
  const landscape = ratio >= 1.3;
  return (
    <div className={`relative overflow-hidden bg-[#0d1226] ${className}`}>
      {!landscape && (
        // eslint-disable-next-line @next/next/no-img-element -- Wikimedia's own image service
        <img src={img.url} alt="" aria-hidden="true" loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable={false} className="absolute inset-0 h-full w-full scale-125 object-cover opacity-45 blur-2xl" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- Wikimedia's own image service */}
      <img
        src={img.url}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setFailed(true)}
        className={`relative h-full w-full ${landscape ? "object-cover" : "object-contain"}`}
        style={landscape ? { objectPosition: "50% 28%" } : undefined}
      />
    </div>
  );
}
