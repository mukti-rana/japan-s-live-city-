import { USER_AGENT } from "@/lib/news/providers";
import { safeUrl } from "@/lib/news/normalize";
import { getSource } from "@/lib/news/sources";
import type { Article } from "@/lib/news/types";

// Some publishers' feeds carry no picture (NHK, Japan Today, DW…). Their
// article pages name a preview image for link-sharing (the "og:image" tag —
// the same picture chat apps show when you paste a link). We read only that
// tag, only for the stories being shown, and remember the answer, so a
// publisher is never hit for every story on every page view.
//
// If a story has no such image, it simply has none: the card shows an
// "Image unavailable" placeholder. Nothing is ever substituted.

interface Cached {
  url: string | null;
  at: number;
}

const cache = new Map<string, Cached>();
const FOUND_TTL = 6 * 60 * 60 * 1000;
const MISSING_TTL = 30 * 60 * 1000;
const MAX_BYTES = 160 * 1024;
const CONCURRENCY = 12;

function extractImage(html: string, pageUrl: string): string | null {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const wanted of ["og:image:secure_url", "og:image", "twitter:image"]) {
    for (const meta of metas) {
      const key = meta.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      if (key !== wanted) continue;
      const content = meta.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!content) continue;
      try {
        const resolved = safeUrl(new URL(content.replace(/&amp;/g, "&"), pageUrl).toString());
        if (resolved && !/\.svg(\?|$)/i.test(resolved)) return resolved;
      } catch {
        // malformed URL — try the next tag
      }
    }
  }
  return null;
}

async function readHead(url: string, allowedHosts: string[], timeoutMs: number): Promise<string | null> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  // A redirect off the publisher's own domain is not followed any further.
  if (!res.ok || !res.body || !safeUrl(res.url, allowedHosts)) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (html.includes("</head>")) break;
  }
  void reader.cancel().catch(() => {});
  return html;
}

async function previewImage(article: Article, timeoutMs: number): Promise<string | null> {
  const hit = cache.get(article.url);
  if (hit && Date.now() - hit.at < (hit.url ? FOUND_TTL : MISSING_TTL)) return hit.url;

  const source = getSource(article.sourceId);
  let url: string | null = null;
  if (source) {
    try {
      const html = await readHead(article.url, source.hosts, timeoutMs);
      url = html ? extractImage(html, article.url) : null;
    } catch {
      url = null;
    }
  }
  cache.set(article.url, { url, at: Date.now() });
  return url;
}

// What we already know about a story's preview image: its URL, null if the
// publisher has none, or undefined if we haven't looked yet.
export function cachedPreview(article: Article): string | null | undefined {
  const hit = cache.get(article.url);
  if (!hit || Date.now() - hit.at >= (hit.url ? FOUND_TTL : MISSING_TTL)) return undefined;
  return hit.url;
}

// Looks up missing preview images (publishers can be slow — NHK takes a few
// seconds a page — so this runs apart from the page itself).
export async function enrichImages(articles: Article[], timeoutMs = 3500): Promise<Article[]> {
  const out = articles.map((a) => ({ ...a }));
  const queue = out.filter((a) => !a.imageUrl && !a.video && getSource(a.sourceId)?.previewImage);

  async function worker() {
    for (let a = queue.shift(); a; a = queue.shift()) {
      a.imageUrl = await previewImage(a, timeoutMs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return out;
}
