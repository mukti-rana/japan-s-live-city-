import { canonicalUrl, similarity, titleTokens } from "@/lib/news/normalize";
import { enrichImages } from "@/lib/news/images";
import { fetchChannel, fetchFeed } from "@/lib/news/providers";
import { NEWS_SOURCES, VIDEO_CHANNELS } from "@/lib/news/sources";
import type { Article, SourceStatus } from "@/lib/news/types";

export interface NewsSnapshot {
  articles: Article[];
  sources: SourceStatus[];
  // When the data was actually retrieved. The UI shows this rather than
  // claiming the news is "live".
  fetchedAt: number;
}

const TTL_MS = 10 * 60 * 1000;
// Two headlines this alike, within a day and a half, are the same story.
const SAME_STORY = 0.72;
const SAME_STORY_WINDOW_MS = 36 * 60 * 60 * 1000;

// Prefer the copy with a picture, then the one with a summary.
function richness(a: Article): number {
  return (a.imageUrl ? 2 : 0) + (a.summary ? 1 : 0);
}

function merge(keep: Article, other: Article): Article {
  const best = richness(other) > richness(keep) ? other : keep;
  const rest = best === keep ? other : keep;
  return {
    ...best,
    imageUrl: best.imageUrl ?? rest.imageUrl,
    summary: best.summary ?? rest.summary,
    breaking: best.breaking || rest.breaking,
    places: [...new Set([...best.places, ...rest.places])],
    topic: best.topic === "general" ? rest.topic : best.topic,
    asia: best.asia || rest.asia,
  };
}

// Removes repeats: the same URL (a publisher's story often appears in
// several section feeds) and near-identical headlines from the same language
// (the same wire story run twice). A video and an article about the same
// event are different things and are both kept.
export function dedupe(articles: Article[]): Article[] {
  const sorted = [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const byUrl = new Map<string, Article>();
  for (const a of sorted) {
    const key = canonicalUrl(a.url);
    const existing = byUrl.get(key);
    byUrl.set(key, existing ? merge(existing, a) : a);
  }

  const kept: { article: Article; tokens: Set<string>; time: number }[] = [];
  for (const article of byUrl.values()) {
    const time = new Date(article.publishedAt).getTime();
    const tokens = titleTokens(article.title);
    let duplicateOf = -1;
    if (!article.video && tokens.size >= 4) {
      for (let i = kept.length - 1; i >= 0; i--) {
        const other = kept[i];
        if (other.time - time > SAME_STORY_WINDOW_MS) break; // sorted newest-first
        if (other.article.video || other.article.language !== article.language) continue;
        if (similarity(tokens, other.tokens) >= SAME_STORY) {
          duplicateOf = i;
          break;
        }
      }
    }
    if (duplicateOf >= 0) {
      kept[duplicateOf].article = merge(kept[duplicateOf].article, article);
    } else {
      kept.push({ article, tokens, time });
    }
  }
  return kept.map((k) => k.article);
}

async function build(): Promise<NewsSnapshot> {
  const all: Article[] = [];
  const sources: SourceStatus[] = [];

  await Promise.all([
    ...NEWS_SOURCES.map(async (source) => {
      const results = await Promise.allSettled(source.feeds.map((feed) => fetchFeed(source, feed)));
      const ok = results.filter((r): r is PromiseFulfilledResult<Article[]> => r.status === "fulfilled");
      const items = ok.flatMap((r) => r.value);
      all.push(...items);
      const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      sources.push({
        id: source.id,
        name: source.name,
        ok: ok.length > 0,
        count: items.length,
        error: ok.length === 0 && firstError ? String(firstError.reason?.message ?? firstError.reason) : undefined,
      });
    }),
    ...VIDEO_CHANNELS.map(async (channel) => {
      try {
        const items = await fetchChannel(channel);
        all.push(...items);
        sources.push({ id: `yt:${channel.channelId}`, name: channel.name, ok: true, count: items.length });
      } catch (error) {
        sources.push({
          id: `yt:${channel.channelId}`,
          name: channel.name,
          ok: false,
          count: 0,
          error: error instanceof Error ? error.message : "Request failed",
        });
      }
    }),
  ]);

  return { articles: dedupe(all), sources, fetchedAt: Date.now() };
}

let snapshot: NewsSnapshot | null = null;
let inflight: Promise<NewsSnapshot> | null = null;

function refresh(): Promise<NewsSnapshot> {
  inflight ??= build()
    .then((fresh) => {
      // Keep the last good data if everything failed this time, so a
      // network blip doesn't blank the page — its timestamp stays honest.
      if (fresh.articles.length > 0 || !snapshot) snapshot = fresh;
      else snapshot = { ...snapshot, sources: fresh.sources };
      // Warm the preview-image cache for the newest stories, which is what the
      // first page of most views shows. Best effort; errors are ignored.
      void enrichImages(snapshot.articles.filter((a) => !a.video).slice(0, 24)).catch(() => {});
      return snapshot;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Everything we have, refreshed at most every ten minutes. Many visitors
// share one fetch; providers are never asked per page view.
export async function getNewsSnapshot(): Promise<NewsSnapshot> {
  // An empty result (every provider down) is retried after a minute, not ten.
  const ttl = snapshot && snapshot.articles.length === 0 ? 60_000 : TTL_MS;
  if (snapshot && Date.now() - snapshot.fetchedAt < ttl) return snapshot;
  if (snapshot) {
    void refresh();
    return snapshot;
  }
  return refresh();
}

// Looks stories up by id (used to resolve their preview images).
export async function findArticles(ids: string[]): Promise<Article[]> {
  const wanted = new Set(ids);
  return (await getNewsSnapshot()).articles.filter((a) => wanted.has(a.id));
}
