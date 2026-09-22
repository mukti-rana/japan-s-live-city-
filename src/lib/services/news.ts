// Real headlines from trusted Japan news sources, via their public RSS
// feeds. Only sources whose feeds are free to aggregate (headline + link
// back) are included — Nikkei Asia's RSS terms restrict use to personal,
// noncommercial newsreaders, and Asahi Shimbun's feed carries an explicit
// "no reproduction or republication" notice, so neither is used here.
// Reuters no longer offers a public RSS feed at all.

import Parser from "rss-parser";

interface JtoItem {
  categories?: string[];
  contentSnippet?: string;
  content?: string;
  "media:thumbnail"?: { $?: { url?: string } };
}

const parser = new Parser<Record<string, unknown>, JtoItem>({
  customFields: {
    item: [["media:thumbnail", "media:thumbnail"]],
  },
});

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  language: "en" | "ja";
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "nhk",
    name: "NHK",
    url: "https://news.web.nhk/n-data/conf/na/rss/cat0.xml",
    language: "ja",
  },
  {
    id: "japan-times",
    name: "The Japan Times",
    url: "https://www.japantimes.co.jp/feed/",
    language: "en",
  },
  {
    id: "japan-today",
    name: "Japan Today",
    url: "https://japantoday.com/feed/atom",
    language: "en",
  },
  {
    id: "yomiuri",
    name: "The Japan News",
    url: "https://japannews.yomiuri.co.jp/feed/",
    language: "en",
  },
];

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  sourceId: string;
  language: "en" | "ja";
  publishedAt: string;
  // The following are only present when the source's own feed actually
  // provides them — never inferred or guessed. Japan Times and Yomiuri
  // publish a real <category> tag; Japan Today doesn't tag categories but
  // its article URLs contain a real /category/<slug>/ segment, which is
  // reused here rather than left out. NHK's feed has neither, so its
  // items simply have no category — shown as "Uncategorized", not a
  // fabricated one.
  category?: string;
  summary?: string;
  imageUrl?: string;
}

// Yomiuri tags every item with an access-tier marker alongside its real
// topic category (e.g. "Politics & Government", "(1) 無料記事") — this
// filters that marker out so only the genuine topic tag is kept.
function yomiuriCategory(categories: string[] | undefined): string | undefined {
  return categories?.find((c) => !/無料記事|有料記事/.test(c));
}

// Japan Today doesn't tag categories in the feed, but every article URL
// contains a real /category/<slug>/ segment the site itself uses — e.g.
// ".../category/world/..." or ".../category/sports/...".
function japanTodayCategory(link: string): string | undefined {
  const match = link.match(/\/category\/([a-z0-9-]+)\//i);
  if (!match) return undefined;
  const slug = match[1].replace(/-/g, " ");
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function extractCategory(sourceId: string, item: JtoItem, link: string): string | undefined {
  if (sourceId === "japan-times") return item.categories?.[0];
  if (sourceId === "yomiuri") return yomiuriCategory(item.categories);
  if (sourceId === "japan-today") return japanTodayCategory(link);
  return undefined;
}

function extractSummary(item: JtoItem): string | undefined {
  const raw = item.contentSnippet ?? item.content;
  if (!raw) return undefined;
  const text = raw.replace(/<[^>]+>/g, "").trim();
  return text.length > 0 ? text.slice(0, 220) : undefined;
}

function extractImage(sourceId: string, item: JtoItem): string | undefined {
  if (sourceId !== "japan-times") return undefined;
  return item["media:thumbnail"]?.$?.url;
}

async function fetchFeed(source: NewsSource, limit: number): Promise<NewsItem[]> {
  const res = await fetch(source.url, {
    next: { revalidate: 900 },
    headers: {
      "User-Agent": "LiveCityJapan/1.0 (educational project; headline aggregator)",
    },
  });

  if (!res.ok) {
    throw new Error(`${source.name} responded with ${res.status}`);
  }

  const xml = await res.text();
  const feed = await parser.parseString(xml);

  return (feed.items ?? [])
    .filter((item) => item.title && item.link)
    .slice(0, limit)
    .map((item) => ({
      title: item.title!.trim(),
      link: item.link!,
      source: source.name,
      sourceId: source.id,
      language: source.language,
      publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      category: extractCategory(source.id, item, item.link!),
      summary: extractSummary(item),
      imageUrl: extractImage(source.id, item),
    }));
}

export interface LatestNewsResult {
  items: NewsItem[];
  failedSources: string[];
}

export async function getLatestNews(limitPerSource = 6): Promise<LatestNewsResult> {
  const results = await Promise.allSettled(
    NEWS_SOURCES.map((source) => fetchFeed(source, limitPerSource)),
  );

  const items: NewsItem[] = [];
  const failedSources: string[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      failedSources.push(NEWS_SOURCES[i].name);
    }
  });

  items.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return { items, failedSources };
}
