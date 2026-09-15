import { Newspaper } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { getLatestNews, type NewsItem } from "@/lib/services/news";
import { formatRelativeTime } from "@/lib/format";

export default async function NewsWidget() {
  const { items, failedSources } = await getLatestNews(6).catch<{
    items: NewsItem[];
    failedSources: string[];
  }>(() => ({ items: [], failedSources: [] }));

  const topItems = items.slice(0, 4);

  return (
    <WidgetFrame
      icon={Newspaper}
      label="Latest News"
      accent="azure"
      viewAll
      viewAllHref="/news"
    >
      {topItems.length === 0 ? (
        <p className="text-xs text-sakura">
          News is temporarily unavailable.
        </p>
      ) : (
        <ul className="flex flex-col">
          {topItems.map((item) => (
            <li
              key={item.link}
              className="border-b border-glass-border py-2.5 last:border-0"
            >
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="group block">
                <p className="text-[11px] text-muted">
                  {item.source} <span className="text-glass-border">·</span>{" "}
                  {formatRelativeTime(item.publishedAt)}
                </p>
                <p
                  className={`mt-0.5 text-xs font-medium leading-snug text-foreground group-hover:text-azure ${
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

      {failedSources.length > 0 && (
        <p className="text-[10px] text-muted">
          Unavailable right now: {failedSources.join(", ")}
        </p>
      )}
    </WidgetFrame>
  );
}
