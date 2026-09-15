import type { Metadata } from "next";
import { Flame, ExternalLink } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import { getTrendingTopics, type TrendingTopic } from "@/lib/services/trending";

export const metadata: Metadata = {
  title: "Trending — Live City Japan",
  description: "The most-viewed topics on Japanese Wikipedia right now.",
};

export default async function TrendingPage() {
  const topics = await getTrendingTopics(15).catch<TrendingTopic[] | null>(() => null);

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Live
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Trending Now
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            The most-viewed topics on Japanese Wikipedia over the past 24
            hours — a real signal for what Japan is curious about right now.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <GlassCard className="max-w-lg p-5">
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sakura/15 text-sakura">
              <Flame size={17} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Top articles in Japan
            </p>
          </div>

          {!topics ? (
            <p className="mt-3 text-sm text-sakura">
              Trending topics couldn&apos;t be loaded right now. Please try
              again shortly.
            </p>
          ) : (
            <ol className="flex flex-col">
              {topics.map((topic) => (
                <li
                  key={topic.title}
                  className="flex items-center gap-3 border-b border-glass-border py-3 last:border-0"
                >
                  <span className="w-5 shrink-0 text-sm font-semibold text-muted">
                    {topic.rank}
                  </span>
                  <a
                    href={topic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group min-w-0 flex-1"
                  >
                    <p className="font-jp truncate text-sm font-medium text-foreground group-hover:text-azure">
                      {topic.title}
                    </p>
                    <p className="text-xs text-muted">{topic.viewsLabel}</p>
                  </a>
                  <ExternalLink size={13} className="shrink-0 text-muted" />
                </li>
              ))}
            </ol>
          )}

          <p className="mt-4 text-[11px] text-muted">
            Source: Wikimedia pageview stats (ja.wikipedia.org). Updated
            hourly. Links open the article on Wikipedia.
          </p>
        </GlassCard>
      </Reveal>
    </div>
  );
}
