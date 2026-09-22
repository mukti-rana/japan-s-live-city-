"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatRelativeTime } from "@/lib/format";
import type { NewsItem } from "@/lib/services/news";

// How many distinct real category tags to surface as tabs, beyond "All
// Japan" and "Uncategorized" — capped so the tab row stays usable even
// when a feed carries many different tags.
const MAX_CATEGORY_TABS = 7;
const TOP_STORIES_COUNT = 5;

// Stable, locale-independent tab ids — real category names (e.g. "Sports",
// "JAPAN") already come straight from the feed and don't change with
// locale, but these two synthetic tabs have a translated label, so their
// selection identity has to stay separate from that label (see Tabs'
// `getLabel`) or switching language would silently reset the filter.
const ALL_JAPAN = "__all_japan__";
const UNCATEGORIZED = "__uncategorized__";

function explainHref(item: NewsItem): string {
  const prompt = `Explain this Japan news headline: "${item.title}" (${item.source})`;
  return `/ai-assistant?q=${encodeURIComponent(prompt)}`;
}

export default function NewsExplorer({
  items,
  failedSources,
}: {
  items: NewsItem[];
  failedSources: string[];
}) {
  const { t } = useLanguage();
  const [category, setCategory] = useState(ALL_JAPAN);

  // Tabs are derived entirely from categories actually present in the real
  // feed data (see news.ts) — never a fixed, invented list. Sorted by how
  // many real items carry each tag, most common first.
  const categoryTabs = useMemo(() => {
    const counts = new Map<string, number>();
    let hasUncategorized = false;
    for (const item of items) {
      if (item.category) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
      else hasUncategorized = true;
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
    const tabs = [ALL_JAPAN, ...sorted.slice(0, MAX_CATEGORY_TABS)];
    if (hasUncategorized) tabs.push(UNCATEGORIZED);
    return tabs;
  }, [items]);

  function categoryTabLabel(tab: string): string {
    if (tab === ALL_JAPAN) return t("news.allJapan");
    if (tab === UNCATEGORIZED) return t("news.uncategorized");
    return tab;
  }

  // Top Stories is always the most recent nationwide items, unaffected by
  // the category filter below — the filter only narrows the Latest list.
  const topStories = items.slice(0, TOP_STORIES_COUNT);

  const filtered = useMemo(() => {
    if (category === ALL_JAPAN) return items;
    if (category === UNCATEGORIZED) return items.filter((item) => !item.category);
    return items.filter((item) => item.category === category);
  }, [items, category]);

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sakura/15 text-sakura">
            <Newspaper size={17} />
          </div>
          <p className="text-sm font-semibold text-foreground">
            🔥 <T k="news.topStories" />
          </p>
          {items.length > 0 && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
              {t("widget.live")}
            </span>
          )}
        </div>

        {topStories.length === 0 ? (
          <p className="text-sm text-sakura">
            <T k="widget.newsUnavailable" />
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topStories.map((item) => (
              <a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 rounded-xl border border-glass-border bg-glass-bg p-3 transition-colors hover:border-azure/30"
              >
                {item.imageUrl && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-glass-bg-strong">
                    {/* eslint-disable-next-line @next/next/no-img-element -- real thumbnail from the source's own feed, host not known in advance so it isn't in next.config's image allowlist */}
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted">
                    <span className="font-medium text-foreground/80">{item.source}</span>{" "}
                    <span className="text-glass-border">·</span> {formatRelativeTime(item.publishedAt)}
                    {item.category && (
                      <>
                        {" "}
                        <span className="text-glass-border">·</span>{" "}
                        <span className="text-azure">{item.category}</span>
                      </>
                    )}
                  </p>
                  <p
                    className={`mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-azure ${
                      item.language === "ja" ? "font-jp" : ""
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{item.summary}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">
          📰 <T k="news.latestJapanNews" />
        </p>

        <div className="mb-4">
          <Tabs tabs={categoryTabs} value={category} onChange={setCategory} getLabel={categoryTabLabel} />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted">
            <T k="widget.newsUnavailable" />
          </p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((item) => (
              <li
                key={item.link}
                className="flex flex-col gap-1.5 border-b border-glass-border py-3.5 last:border-0 sm:flex-row sm:items-start sm:gap-3"
              >
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group min-w-0 flex-1"
                >
                  <p className="text-xs text-muted">
                    <span className="font-medium text-foreground/80">{item.source}</span>{" "}
                    <span className="text-glass-border">·</span> {formatRelativeTime(item.publishedAt)}
                    {item.category && (
                      <>
                        {" "}
                        <span className="ml-1 rounded-full bg-azure/15 px-1.5 py-0.5 text-[10px] text-azure">
                          {item.category}
                        </span>
                      </>
                    )}
                  </p>
                  <p
                    className={`mt-1 text-sm font-medium leading-snug text-foreground group-hover:text-azure ${
                      item.language === "ja" ? "font-jp" : ""
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{item.summary}</p>
                  )}
                </a>
                <div className="flex shrink-0 items-center gap-3 sm:mt-0.5">
                  <Link href={explainHref(item)} className="text-[11px] font-medium text-azure hover:underline">
                    <T k="news.explain" />
                  </Link>
                  <ExternalLink size={13} className="text-muted" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {failedSources.length > 0 && (
          <p className="mt-4 text-[11px] text-sakura">
            <T k="widget.unavailableRightNow" /> {failedSources.join(", ")}
          </p>
        )}

        <p className="mt-4 text-[11px] text-muted">
          Headlines link to the original publisher. Live City Japan does not host or republish full articles.
        </p>
      </GlassCard>
    </div>
  );
}
