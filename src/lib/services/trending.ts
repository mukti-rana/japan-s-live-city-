// Real trending topics — the most-viewed Japanese Wikipedia articles for
// the most recent complete day, via Wikimedia's free, keyless REST API.
// https://wikimedia.org/api/rest_v1/

const EXCLUDED_PREFIXES = [
  "special:",
  "特別:",
  "wikipedia:",
  "template:",
  "file:",
  "ファイル:",
  "category:",
  "help:",
  "portal:",
  "user:",
  "talk:",
];

const EXCLUDED_EXACT = ["メインページ", "→"];

// Best-effort safety net — Wikipedia's raw "most viewed" list can include
// adult-content and sensitive (e.g. suicide-method) articles further down
// the ranking. This app only ever surfaces a small top-N slice, but this
// list guards against anything inappropriate ranking unusually high on a
// given day. Not exhaustive; a keyword pass, not real content moderation.
const SAFETY_BLOCKLIST = [
  "性行為",
  "セックス",
  "オナニー",
  "フェラチオ",
  "クンニ",
  "女性器",
  "男性器",
  "射精",
  "まんこ",
  "ちんこ",
  "av女優",
  "潮吹き",
  "風俗",
  "ソープ",
  "わいせつ",
  "強姦",
  "レイプ",
  "自殺",
  "縊死",
  "自決",
  "自害",
];

interface WikimediaArticle {
  article: string;
  views: number;
  rank: number;
}

export interface TrendingTopic {
  title: string;
  views: number;
  viewsLabel: string;
  rank: number;
  url: string;
}

export function isDisplayable(article: string): boolean {
  const lower = article.toLowerCase();
  if (EXCLUDED_PREFIXES.some((p) => lower.startsWith(p))) return false;
  if (EXCLUDED_EXACT.includes(article)) return false;
  if (SAFETY_BLOCKLIST.some((term) => lower.includes(term))) return false;
  return true;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K views`;
  return `${n} views`;
}

export async function getTrendingTopics(limit = 10): Promise<TrendingTopic[]> {
  // Wikimedia's pageview stats arrive after a delay of up to a day or so, so
  // use the newest of the last three (UTC) days that is available.
  let articles: WikimediaArticle[] | null = null;
  let lastStatus = 0;
  for (let back = 1; back <= 3 && !articles; back++) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - back);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const res = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/ja.wikipedia/all-access/${year}/${month}/${day}`, {
      next: { revalidate: 3600 },
      headers: { "Api-User-Agent": "LiveCityJapan/1.0 (educational project)" },
    });
    lastStatus = res.status;
    if (res.ok) {
      const data = (await res.json()) as { items: { articles: WikimediaArticle[] }[] };
      articles = data.items[0]?.articles ?? [];
    }
  }
  if (!articles) throw new Error(`Wikimedia API responded with ${lastStatus}`);

  return articles
    .filter((a) => isDisplayable(a.article))
    .slice(0, limit)
    .map((a, i) => ({
      title: decodeURIComponent(a.article).replace(/_/g, " "),
      views: a.views,
      viewsLabel: formatViews(a.views),
      rank: i + 1,
      url: `https://ja.wikipedia.org/wiki/${a.article}`,
    }));
}
