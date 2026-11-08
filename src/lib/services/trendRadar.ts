import { isDisplayable } from "@/lib/services/trending";

// Japan Trend Radar: the same real signal as the Trending page — the most
// viewed Japanese Wikipedia articles of the latest complete day (Wikimedia's
// free, keyless pageview API) — enriched, from Wikipedia itself, with each
// article's picture, a short explanation, its category and its name in other
// languages. Whether a topic is New or Rising is worked out from the day
// before; if that comparison isn't available no status is shown. Cached for an
// hour; if a refresh fails the last good result is kept and flagged as old.

export type TrendCategory = "news" | "local" | "anime" | "tech" | "sports" | "entertainment" | "travel" | "festival";
export type TrendStatus = "new" | "rising" | "popular";

export interface RadarTopic {
  id: string;
  rank: number;
  title: string; // Japanese article title
  names: Partial<Record<"en" | "zh" | "ko" | "hi" | "ne", string>>;
  description: string | null; // Wikipedia's one-line description (Japanese)
  summary: { ja: string | null; en: string | null };
  image: { url: string; page: string } | null;
  category: TrendCategory | null;
  status: TrendStatus | null;
  views: number;
  url: string;
}

export interface TrendRadarData {
  items: RadarTopic[];
  // The day the pageview counts are for (YYYY-MM-DD, UTC) and when we fetched.
  dataDate: string;
  fetchedAt: number;
  // True when this is the last good result kept after a failed refresh.
  stale: boolean;
}

const UA = { "Api-User-Agent": "LiveCityJapan/1.0 (educational project; trend radar)" };
const TTL_MS = 60 * 60 * 1000;
const COUNT = 24;
const LANGS = ["en", "zh", "ko", "hi", "ne"] as const;

// ── Category rules over Wikipedia's own category names and description ────
const RULES: { cat: TrendCategory; re: RegExp }[] = [
  { cat: "festival", re: /祭り|祭礼|花火|行事|博覧会|フェスティバル/ },
  { cat: "anime", re: /アニメ|漫画|マンガ|ライトノベル|少年ジャンプ|コミック|ゲームソフト|ビデオゲーム|ゲーム作品/ },
  { cat: "sports", re: /スポーツ|野球|サッカー|相撲|力士|オリンピック|競馬|ラグビー|テニス|ゴルフ|格闘|プロレス|バスケ|バレー|陸上|マラソン|選手/ },
  { cat: "tech", re: /コンピュータ|ソフトウェア|人工知能|情報技術|インターネット|スマートフォン|半導体|プログラミング|ウェブ|ロボット|宇宙開発|技術/ },
  { cat: "entertainment", re: /俳優|女優|歌手|タレント|芸能|映画|テレビドラマ|テレビ番組|音楽|声優|アイドル|お笑い|バンド|アーティスト|ミュージシャン|ドラマ|YouTuber|ユーチューバー/ },
  { cat: "travel", re: /観光|城|神社|寺院|世界遺産|温泉|日本の文化|名所|庭園|博物館|美術館|遺跡|史跡|国宝|重要文化財|祭礼/ },
  { cat: "news", re: /事件|事故|政治|政治家|内閣|国会議員|選挙|災害|地震|殺人|裁判|与党|野党|首相|大臣|政党|犯罪|テロ|戦争|紛争/ },
  { cat: "local", re: /都道府県|市町村|日本の市|日本の町|日本の村|日本の区|日本の駅|鉄道駅|日本の都市|日本の地理/ },
];

function classify(text: string, only?: TrendCategory[]): TrendCategory | null {
  for (const r of RULES) if ((!only || only.includes(r.cat)) && r.re.test(text)) return r.cat;
  return null;
}

// Wikipedia's one-line description ("日本の女優、タレント") is the clearest
// signal. Its category list is noisy for people (a footballer's wife sits in
// football categories), so it is only consulted for things, not people.
function categorize(description: string | null, categories: string): TrendCategory | null {
  return classify(description ?? "") ?? classify(categories, ["anime", "festival", "travel", "local"]);
}

// ── Wikimedia / Wikipedia calls ──────────────────────────────────────────
async function topViews(date: Date): Promise<{ article: string; views: number; rank: number }[]> {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const res = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/ja.wikipedia/all-access/${y}/${m}/${d}`, { next: { revalidate: 3600 }, headers: UA, signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`Wikimedia responded ${res.status}`);
  const data = (await res.json()) as { items: { articles: { article: string; views: number; rank: number }[] }[] };
  return data.items[0]?.articles ?? [];
}

type Page = {
  title: string;
  description?: string;
  extract?: string;
  thumbnail?: { source: string };
  categories?: { title: string }[];
  langlinks?: { lang: string; "*": string }[];
};

async function wikiQuery(host: string, titles: string[], params: string): Promise<Map<string, Page>> {
  const url = `https://${host}/w/api.php?action=query&format=json&redirects=1&titles=${encodeURIComponent(titles.join("|"))}&${params}`;
  const res = await fetch(url, { next: { revalidate: 3600 }, headers: UA, signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`Wikipedia responded ${res.status}`);
  const data = (await res.json()) as { query?: { pages?: Record<string, Page>; redirects?: { from: string; to: string }[]; normalized?: { from: string; to: string }[] } };
  const byTitle = new Map<string, Page>();
  for (const p of Object.values(data.query?.pages ?? {})) byTitle.set(p.title, p);
  // Map the titles we asked for onto the pages found (after normalising / redirects).
  const out = new Map<string, Page>();
  const step = new Map<string, string>();
  for (const n of data.query?.normalized ?? []) step.set(n.from, n.to);
  for (const r of data.query?.redirects ?? []) step.set(r.from, r.to);
  for (const t of titles) {
    let cur = t;
    for (let i = 0; i < 3 && step.has(cur); i++) cur = step.get(cur)!;
    const page = byTitle.get(cur);
    if (page) out.set(t, page);
  }
  return out;
}

// Wikimedia publishes a day's counts after a delay of up to a day or so, so
// use the newest of the last three days that is actually available.
async function latestAvailable(): Promise<{ date: Date; list: Awaited<ReturnType<typeof topViews>> }> {
  let lastError: unknown = new Error("No pageview data");
  for (let back = 1; back <= 3; back++) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - back);
    try {
      return { date, list: await topViews(date) };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function build(): Promise<TrendRadarData> {
  const { date: latest, list: todayList } = await latestAvailable();
  const previous = new Date(latest);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const prevList = await topViews(previous).catch(() => null);
  const prevByArticle = new Map((prevList ?? []).map((a) => [a.article, a]));

  const top = todayList.filter((a) => isDisplayable(a.article)).slice(0, COUNT);
  const titles = top.map((a) => decodeURIComponent(a.article).replace(/_/g, " "));

  // The article details are optional: without them the topic still shows,
  // just without picture, explanation and category.
  const [ja, en, ...others] = await Promise.all([
    wikiQuery("ja.wikipedia.org", titles, "prop=pageimages|description|extracts|categories&piprop=thumbnail&pithumbsize=900&exintro=1&explaintext=1&exsentences=2&exlimit=max&cllimit=max&clshow=!hidden").catch(() => new Map<string, Page>()),
    wikiQuery("ja.wikipedia.org", titles, "prop=langlinks&lllang=en&lllimit=max").catch(() => new Map<string, Page>()),
    ...LANGS.filter((l) => l !== "en").map((l) => wikiQuery("ja.wikipedia.org", titles, `prop=langlinks&lllang=${l}&lllimit=max`).catch(() => new Map<string, Page>())),
  ]);
  const langMaps: Record<string, Map<string, Page>> = { en };
  LANGS.filter((l) => l !== "en").forEach((l, i) => (langMaps[l] = others[i]));

  // English introductions, for the topics that have an English article.
  const enTitles = titles.map((t) => en.get(t)?.langlinks?.[0]?.["*"]).filter((t): t is string => Boolean(t));
  const enSummaries = enTitles.length ? await wikiQuery("en.wikipedia.org", enTitles, "prop=extracts&exintro=1&explaintext=1&exsentences=2&exlimit=max").catch(() => new Map<string, Page>()) : new Map<string, Page>();

  const seen = new Set<string>();
  const items: RadarTopic[] = [];
  top.forEach((a, i) => {
    const title = titles[i];
    if (seen.has(title)) return;
    seen.add(title);
    const page = ja.get(title);
    const cats = (page?.categories ?? []).map((c) => c.title).join(" ");
    const names: RadarTopic["names"] = {};
    for (const l of LANGS) {
      const n = langMaps[l]?.get(title)?.langlinks?.[0]?.["*"];
      if (n) names[l] = n;
    }
    const prev = prevByArticle.get(a.article);
    let status: TrendStatus | null = null;
    if (prevList) {
      if (!prev) status = "new";
      else if (a.views >= prev.views * 1.5 && a.views >= 10_000) status = "rising";
      else if (a.rank <= 10 && prev.rank <= 20) status = "popular";
    }
    items.push({
      id: a.article,
      rank: items.length + 1,
      title,
      names,
      description: page?.description ?? null,
      summary: { ja: page?.extract?.trim() || null, en: names.en ? (enSummaries.get(names.en)?.extract?.trim() ?? null) : null },
      image: page?.thumbnail ? { url: page.thumbnail.source, page: `https://ja.wikipedia.org/wiki/${a.article}` } : null,
      category: categorize(page?.description ?? null, cats),
      status,
      views: a.views,
      url: `https://ja.wikipedia.org/wiki/${a.article}`,
    });
  });

  const dataDate = `${latest.getUTCFullYear()}-${String(latest.getUTCMonth() + 1).padStart(2, "0")}-${String(latest.getUTCDate()).padStart(2, "0")}`;
  return { items, dataDate, fetchedAt: Date.now(), stale: false };
}

let cache: TrendRadarData | null = null;
let inflight: Promise<TrendRadarData> | null = null;
let lastFailure = 0;

// The radar, refreshed at most hourly and shared by every visitor. When a
// refresh fails the previous result is returned marked stale (never silently).
export async function getTrendRadar(): Promise<TrendRadarData> {
  if (cache && !cache.stale && Date.now() - cache.fetchedAt < TTL_MS) return cache;
  // After a failed refresh, keep serving the old result for a minute before trying again.
  if (cache && cache.stale && Date.now() - lastFailure < 60_000) return cache;
  inflight ??= build()
    .then((fresh) => {
      cache = fresh;
      return fresh;
    })
    .catch((error) => {
      lastFailure = Date.now();
      if (cache) {
        cache = { ...cache, stale: true };
        return cache;
      }
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
