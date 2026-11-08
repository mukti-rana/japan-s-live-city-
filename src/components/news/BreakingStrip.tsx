"use client";

import { headlineSaysBreaking } from "@/lib/news/categories";
import type { NewsItem } from "@/lib/news/query";
import { timeAgo, useNewsFeed } from "@/lib/news/useNews";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";

const FRESH_MS = 12 * 3600_000;

// A slim bar, shown only when a publisher's own headline calls a story
// breaking AND it was published in the last 12 hours. Nothing is inferred
// from how fresh or how widely covered a story is, so on most days there is
// no bar at all.
export default function BreakingStrip({ onOpen }: { onOpen: (item: NewsItem) => void }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const feed = useNewsFeed({ cat: "breaking", video: 0, limit: 8 });
  const now = feed.data ? feed.data.fetchedAt : 0;
  const items = (feed.data?.items ?? []).filter((i) => headlineSaysBreaking(i.title) && now - new Date(i.publishedAt).getTime() < FRESH_MS).slice(0, 2);
  if (items.length === 0) return null;
  return (
    <section aria-label={tr("Breaking news")} className="flex flex-col gap-1.5 rounded-2xl border border-sakura/35 bg-sakura/10 px-4 py-3">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-sakura">
        <span className="h-2 w-2 rounded-full bg-sakura shadow-[0_0_8px_2px_rgba(255,111,160,0.7)]" aria-hidden="true" />
        {tr("Breaking news")}
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <button type="button" onClick={() => onOpen(i)} className={`text-left font-medium text-foreground hover:text-sakura focus-visible:outline-none focus-visible:underline ${i.language === "ja" ? "font-jp" : ""}`}>
              {i.title}
            </button>
            <span className="text-[11px] text-muted">
              {i.sourceName} · {timeAgo(i.publishedAt, language)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
