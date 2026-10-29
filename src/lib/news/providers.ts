import Parser from "rss-parser";
import { headlineSaysBreaking, mentionsAsia, topicFromText } from "@/lib/news/categories";
import { articleId, canonicalUrl, cleanUrl, safeUrl, summaryOf, toPlainText } from "@/lib/news/normalize";
import { detectPlaces } from "@/lib/news/places";
import type { FeedConfig, SourceDef, VideoChannel } from "@/lib/news/sources";
import type { Article, TopicId } from "@/lib/news/types";

export const USER_AGENT = "LiveCityJapan/1.0 (educational project; headline aggregator)";

interface FeedItem {
  mediaThumb?: unknown;
  mediaContent?: unknown;
  contentEncoded?: string;
  enclosure?: { url?: string; type?: string };
}

const parser = new Parser<Record<string, unknown>, FeedItem>({
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumb"],
      ["media:content", "mediaContent"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

async function fetchText(url: string, revalidate = 600): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(9000),
    next: { revalidate },
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// rss-parser returns attribute-carrying elements as { $: { url } }, possibly
// in an array when a feed repeats them.
function attrUrl(value: unknown): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first || typeof first !== "object") return null;
  const url = (first as { $?: { url?: string } }).$?.url;
  return typeof url === "string" ? url : null;
}

function feedImage(item: FeedItem): string | null {
  const candidates = [
    attrUrl(item.mediaThumb),
    attrUrl(item.mediaContent),
    item.enclosure?.type?.startsWith("image/") ? item.enclosure.url : null,
    item.contentEncoded?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null,
  ];
  for (const c of candidates) {
    const url = safeUrl(c ?? undefined);
    if (url) return url;
  }
  return null;
}

// Japan Today files each story under /category/<slug>/.
const JAPAN_TODAY_SLUGS: Record<string, { topic?: TopicId; scope?: "international" }> = {
  world: { scope: "international" },
  national: {},
  business: { topic: "economy" },
  tech: { topic: "tech" },
  technology: { topic: "tech" },
  sports: { topic: "sports" },
  entertainment: { topic: "entertainment" },
  lifestyle: { topic: "society" },
  travel: { topic: "travel" },
  politics: { topic: "politics" },
  science: { topic: "science" },
  crime: { topic: "crime" },
};

// A publisher's own section decides the topic when it is specific. The
// keyword rules only fill in for broad sections (society / no section), plus
// one safety override so natural-hazard stories are always filed as such.
function pickTopic(sectionTopic: TopicId | undefined, text: string): TopicId {
  const keyword = topicFromText(text);
  if (!sectionTopic || sectionTopic === "society" || sectionTopic === "general") {
    return keyword ?? sectionTopic ?? "general";
  }
  if (keyword === "earthquake" || keyword === "weather") return keyword;
  return sectionTopic;
}

function buildArticle(source: SourceDef, feed: FeedConfig, item: Parser.Item & FeedItem): Article | null {
  const title = toPlainText(item.title);
  const url = safeUrl(item.link, source.hosts);
  const published = new Date(item.isoDate ?? item.pubDate ?? "");
  if (!title || !url || Number.isNaN(published.getTime())) return null;

  const summary = summaryOf(item.contentSnippet ?? item.content ?? item.summary, title);
  const text = `${title} ${summary ?? ""}`;

  let topic: TopicId | undefined = feed.topic;
  let scope: "japan" | "international" = feed.scope ?? "japan";
  if (source.id === "japan-today") {
    const slug = new URL(url).pathname.match(/\/category\/([a-z0-9-]+)\//i)?.[1]?.toLowerCase();
    const mapped = slug ? JAPAN_TODAY_SLUGS[slug] : undefined;
    topic = mapped?.topic;
    if (mapped?.scope) scope = mapped.scope;
  }

  const canonical = canonicalUrl(url);
  return {
    id: articleId(canonical),
    title,
    summary,
    url: cleanUrl(url),
    sourceId: source.id,
    sourceName: source.name,
    language: source.language,
    publishedAt: published.toISOString(),
    topic: pickTopic(topic, text),
    scope,
    asia: Boolean(feed.asia) || (scope === "international" && mentionsAsia(text)),
    places: scope === "japan" ? detectPlaces(text) : [],
    breaking: Boolean(feed.top) || headlineSaysBreaking(title),
    imageUrl: feedImage(item),
    video: null,
  };
}

export async function fetchFeed(source: SourceDef, feed: FeedConfig): Promise<Article[]> {
  const xml = await fetchText(feed.url);
  const parsed = await parser.parseString(xml);
  return (parsed.items ?? [])
    .slice(0, 60)
    .map((item) => buildArticle(source, feed, item))
    .filter((a): a is Article => a !== null);
}

// ── YouTube channel feeds ────────────────────────────────────────────────

function tag(entry: string, name: string): string | null {
  return entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? null;
}

export async function fetchChannel(channel: VideoChannel): Promise<Article[]> {
  const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`);
  const articles: Article[] = [];

  for (const entry of xml.split("<entry>").slice(1, 16)) {
    const videoId = tag(entry, "yt:videoId");
    const title = toPlainText(tag(entry, "title"));
    const published = new Date(tag(entry, "published") ?? "");
    if (!videoId || !/^[\w-]{11}$/.test(videoId) || !title || Number.isNaN(published.getTime())) continue;

    // YouTube descriptions are mostly links and hashtags; keep only prose.
    const description = toPlainText(tag(entry, "media:description"))
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[#＃]\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const summary = summaryOf(description, title, 240);
    const text = `${title} ${summary ?? ""}`;
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    articles.push({
      id: articleId(canonicalUrl(url)),
      title,
      summary,
      url,
      sourceId: `yt:${channel.channelId}`,
      sourceName: channel.name,
      language: channel.language,
      publishedAt: published.toISOString(),
      topic: topicFromText(text) ?? "general",
      scope: channel.scope,
      asia: Boolean(channel.asia) || (channel.scope === "international" && mentionsAsia(text)),
      places: channel.scope === "japan" ? detectPlaces(text) : [],
      breaking: headlineSaysBreaking(title),
      imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      video: { provider: "youtube", videoId, channel: channel.name },
    });
  }
  return articles;
}
