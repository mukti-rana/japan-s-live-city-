import type { Metadata } from "next";
import { Newspaper, ExternalLink } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import { getLatestNews, NEWS_SOURCES, type NewsItem } from "@/lib/services/news";
import { formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "News — Live City Japan",
  description:
    "Real headlines from NHK, The Japan Times, Japan Today, and The Japan News.",
};

export default async function NewsPage() {
  const { items, failedSources } = await getLatestNews(8).catch<{
    items: NewsItem[];
    failedSources: string[];
  }>(() => ({ items: [], failedSources: NEWS_SOURCES.map((s) => s.name) }));

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Live
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            News
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Real headlines from {NEWS_SOURCES.map((s) => s.name).join(", ")}{" "}
            — Japan&apos;s public broadcaster and major national papers.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <GlassCard className="max-w-2xl p-5">
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-azure/15 text-azure">
              <Newspaper size={17} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Latest headlines
            </p>
          </div>

          {items.length === 0 ? (
            <p className="mt-3 text-sm text-sakura">
              News couldn&apos;t be loaded right now. Please try again
              shortly.
            </p>
          ) : (
            <ul className="flex flex-col">
              {items.map((item) => (
                <li
                  key={item.link}
                  className="flex items-start gap-3 border-b border-glass-border py-3.5 last:border-0"
                >
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group min-w-0 flex-1"
                  >
                    <p className="text-xs text-muted">
                      <span className="font-medium text-foreground/80">
                        {item.source}
                      </span>{" "}
                      <span className="text-glass-border">·</span>{" "}
                      {formatRelativeTime(item.publishedAt)}
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium leading-snug text-foreground group-hover:text-azure ${
                        item.language === "ja" ? "font-jp" : ""
                      }`}
                    >
                      {item.title}
                    </p>
                  </a>
                  <ExternalLink size={13} className="mt-1 shrink-0 text-muted" />
                </li>
              ))}
            </ul>
          )}

          {failedSources.length > 0 && (
            <p className="mt-4 text-[11px] text-sakura">
              Temporarily unavailable: {failedSources.join(", ")}
            </p>
          )}

          <p className="mt-4 text-[11px] text-muted">
            Headlines link to the original publisher. Live City Japan does
            not host or republish full articles.
          </p>
        </GlassCard>
      </Reveal>
    </div>
  );
}
