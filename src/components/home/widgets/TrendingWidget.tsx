import { Flame, ExternalLink } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { getTrendingTopics, type TrendingTopic } from "@/lib/services/trending";

export default async function TrendingWidget() {
  const topics = await getTrendingTopics(5).catch<TrendingTopic[] | null>(() => null);

  return (
    <WidgetFrame
      icon={Flame}
      label="Trending Now"
      accent="sakura"
      viewAll
      viewAllHref="/trending"
    >
      {!topics ? (
        <p className="text-xs text-muted">
          Trending topics are temporarily unavailable.
        </p>
      ) : (
        <ol className="flex flex-col">
          {topics.map((topic) => (
            <li
              key={topic.title}
              className="flex items-center gap-2.5 border-b border-glass-border py-2 last:border-0"
            >
              <span className="w-3 shrink-0 text-xs font-semibold text-muted">
                {topic.rank}
              </span>
              <a
                href={topic.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-w-0 flex-1"
              >
                <p className="font-jp truncate text-xs font-medium text-foreground group-hover:text-azure">
                  {topic.title}
                </p>
                <p className="text-[10px] text-muted">{topic.viewsLabel}</p>
              </a>
              <ExternalLink size={11} className="shrink-0 text-muted" />
            </li>
          ))}
        </ol>
      )}
      <p className="mt-1 text-[10px] text-muted">
        Most-viewed on Japanese Wikipedia, past 24h
      </p>
    </WidgetFrame>
  );
}
