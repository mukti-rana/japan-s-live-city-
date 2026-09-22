import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import T from "@/components/i18n/T";
import HeroAIBox from "@/components/home/HeroAIBox";
import NewsExplorer from "@/components/news/NewsExplorer";
import NewsNearYou from "@/components/news/NewsNearYou";
import { getLatestNews, NEWS_SOURCES, type NewsItem } from "@/lib/services/news";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

export const metadata: Metadata = {
  title: "Japan Live News — Live City Japan",
  description:
    "Real headlines from NHK, The Japan Times, Japan Today, and The Japan News — from across Japan, updated throughout the day.",
};

export default async function NewsPage() {
  const { items, failedSources } = await getLatestNews(20).catch<{
    items: NewsItem[];
    failedSources: string[];
  }>(() => ({ items: [], failedSources: NEWS_SOURCES.map((s) => s.name) }));

  return (
    <LiveLocationProvider>
      <div className="flex flex-col gap-5">
        <Reveal>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-sakura">
              🇯🇵 Live
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              <T k="news.pageTitle" />
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              <T k="news.pageSubtitle" />
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <Reveal delay={0.06}>
            <NewsExplorer items={items} failedSources={failedSources} />
          </Reveal>

          <div className="flex flex-col gap-5">
            <Reveal delay={0.1}>
              <NewsNearYou items={items} />
            </Reveal>
            <Reveal delay={0.14}>
              <div className="overflow-hidden rounded-2xl border border-glass-border bg-panel p-1">
                <HeroAIBox />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </LiveLocationProvider>
  );
}
