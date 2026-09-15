// Real headlines from trusted Japan news sources, via their public RSS
// feeds. Only sources whose feeds are free to aggregate (headline + link
// back) are included — Nikkei Asia's RSS terms restrict use to personal,
// noncommercial newsreaders, and Asahi Shimbun's feed carries an explicit
// "no reproduction or republication" notice, so neither is used here.
// Reuters no longer offers a public RSS feed at all.

import Parser from "rss-parser";

const parser = new Parser();

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
