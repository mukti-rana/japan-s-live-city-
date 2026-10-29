import type { Article, TopicId } from "@/lib/news/types";

// ── Topic rules ──────────────────────────────────────────────────────────
// Plain keyword rules (English + Japanese) used only when a publisher's own
// section doesn't already say what a story is about. They are deliberately
// simple and checked in priority order, so a story about a typhoon that
// stops trains is filed under weather, not transport.
const RULES: { topic: TopicId; re: RegExp; cs?: RegExp }[] = [
  { topic: "earthquake", re: /earthquake|tsunami|seismic|aftershock|magnitude|地震(?!動)|津波|震度|余震|震源/i },
  { topic: "weather", re: /typhoon|heavy rain|downpour|flood|landslide|heat ?wave|heatstroke|snowfall|blizzard|weather agency|台風|大雨|豪雨|洪水|土砂災害|土砂崩れ|猛暑|熱中症|大雪|暴風|気象庁|警報/i },
  { topic: "transport", re: /railway|train service|bullet train|shinkansen|\bJR\b|subway|airline|flights? (?:cancel|delay)|runway|operations? (?:suspend|resum)|運転見合わせ|運休|新幹線|鉄道|電車|空港|欠航/i },
  { topic: "crime", re: /arrest|suspect|police|stabb|murder|robbery|fraud|scam|theft|indict|prosecut|court (?:sentences|rules)|逮捕|容疑|殺人|詐欺|強盗|窃盗|刺され|起訴|判決|警察|事件/i },
  { topic: "politics", re: /prime minister|cabinet|diet\b|lawmaker|election|ruling party|opposition|minister|parliament|president|sanction|treaty|首相|内閣|国会|議員|選挙|与党|野党|大臣|政府|大統領|外交/i },
  { topic: "economy", re: /\beconom|inflation|\byen\b|stock|nikkei|bank of japan|\bBOJ\b|tariff|trade|\bGDP\b|earnings|profit|merger|acquisition|business|market|price|wage|円相場|株価|日銀|物価|賃金|景気|決算|関税|企業|経済/i },
  {
    topic: "tech",
    re: /artificial intelligence|semiconductor|microchip|software|smartphone|robot|cyber|data breach|startup|technology|人工知能|半導体|ロボット|サイバー|スマホ/i,
    // Short acronyms must match case-sensitively, or "it"/"ai" inside
    // ordinary words and names would count.
    cs: /\bAI\b|\bIT\b|生成AI/,
  },
  { topic: "sports", re: /baseball|football|soccer|olympic|world cup|tennis|golf|sumo|rugby|marathon|\bNPB\b|\bJ\.?League\b|championship|野球|サッカー|五輪|相撲|ラグビー|マラソン|大会|優勝|選手/i },
  { topic: "entertainment", re: /\bfilm\b|movie|anime|manga|music|concert|singer|actor|actress|celebrity|festival|exhibition|theater|映画|アニメ|漫画|音楽|歌手|俳優|芸能|ドラマ|展覧会|祭り/i },
  { topic: "travel", re: /tourism|tourist|travel|hotel|sightseeing|visitor|inbound|観光|旅行|ホテル|訪日/i },
  { topic: "science", re: /\bscien|research|study finds|climate|environment|outer space|space agency|JAXA|satellite|rocket|species|biodiversity|astronom|宇宙|研究|気候変動|環境|ロケット|衛星|生物/i },
];

export function topicFromText(text: string): TopicId | null {
  for (const rule of RULES) if (rule.re.test(text) || rule.cs?.test(text)) return rule.topic;
  return null;
}

const ASIA_RE =
  /\bChina\b|Chinese|Beijing|Taiwan|Taipei|Hong Kong|North Korea|South Korea|Korea|Seoul|Pyongyang|India\b|Indian\b|Delhi|Pakistan|Bangladesh|Nepal|Sri Lanka|Thailand|Vietnam|Philippines|Manila|Indonesia|Jakarta|Malaysia|Singapore|Myanmar|Cambodia|Mongolia|Afghanistan|中国|台湾|韓国|北朝鮮|インド|ベトナム|タイ\b|フィリピン|インドネシア/i;

export function mentionsAsia(text: string): boolean {
  return ASIA_RE.test(text);
}

// "Breaking" marks the publisher's own flag — a story in its top-headlines
// feed, or one the headline itself calls breaking. Nothing is guessed from
// how recent a story is.
export function headlineSaysBreaking(title: string): boolean {
  return /^\s*(?:\[?breaking|【?速報)/i.test(title) || /\bbreaking:/i.test(title);
}

// ── Categories ───────────────────────────────────────────────────────────
export type CategoryId =
  | "all"
  | "breaking"
  | "japan"
  | "local"
  | "osaka"
  | "kyoto"
  | "tokyo"
  | "prefectures"
  | "politics"
  | "economy"
  | "tech"
  | "transport"
  | "weather"
  | "earthquake"
  | "crime"
  | "society"
  | "sports"
  | "entertainment"
  | "travel"
  | "international"
  | "asia"
  | "world-politics"
  | "science";

export interface CategoryDef {
  id: CategoryId;
  // Translation key for the label (see dictionaries).
  labelKey: `news.cat.${CategoryId}`;
  // Whether a story belongs to this category. "local" and "prefectures" are
  // place-dependent and handled in query.ts.
  match: (a: Article) => boolean;
}

const MAIN_PREFS = ["osaka", "kyoto", "tokyo"];

export const CATEGORIES: CategoryDef[] = [
  { id: "all", labelKey: "news.cat.all", match: () => true },
  { id: "breaking", labelKey: "news.cat.breaking", match: (a) => a.breaking },
  { id: "japan", labelKey: "news.cat.japan", match: (a) => a.scope === "japan" },
  { id: "local", labelKey: "news.cat.local", match: (a) => a.scope === "japan" },
  { id: "osaka", labelKey: "news.cat.osaka", match: (a) => a.scope === "japan" && a.places.includes("osaka") },
  { id: "kyoto", labelKey: "news.cat.kyoto", match: (a) => a.scope === "japan" && a.places.includes("kyoto") },
  { id: "tokyo", labelKey: "news.cat.tokyo", match: (a) => a.scope === "japan" && a.places.includes("tokyo") },
  {
    id: "prefectures",
    labelKey: "news.cat.prefectures",
    match: (a) => a.scope === "japan" && a.places.some((id) => !MAIN_PREFS.includes(id)),
  },
  { id: "politics", labelKey: "news.cat.politics", match: (a) => a.scope === "japan" && a.topic === "politics" },
  { id: "economy", labelKey: "news.cat.economy", match: (a) => a.topic === "economy" },
  { id: "tech", labelKey: "news.cat.tech", match: (a) => a.topic === "tech" },
  { id: "transport", labelKey: "news.cat.transport", match: (a) => a.topic === "transport" },
  { id: "weather", labelKey: "news.cat.weather", match: (a) => a.topic === "weather" },
  { id: "earthquake", labelKey: "news.cat.earthquake", match: (a) => a.topic === "earthquake" },
  { id: "crime", labelKey: "news.cat.crime", match: (a) => a.topic === "crime" },
  { id: "society", labelKey: "news.cat.society", match: (a) => a.topic === "society" },
  { id: "sports", labelKey: "news.cat.sports", match: (a) => a.topic === "sports" },
  { id: "entertainment", labelKey: "news.cat.entertainment", match: (a) => a.topic === "entertainment" },
  { id: "travel", labelKey: "news.cat.travel", match: (a) => a.topic === "travel" },
  { id: "international", labelKey: "news.cat.international", match: (a) => a.scope === "international" },
  { id: "asia", labelKey: "news.cat.asia", match: (a) => a.scope === "international" && a.asia },
  { id: "world-politics", labelKey: "news.cat.world-politics", match: (a) => a.scope === "international" && a.topic === "politics" },
  { id: "science", labelKey: "news.cat.science", match: (a) => a.topic === "science" },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): CategoryDef | undefined {
  return CATEGORY_BY_ID.get(id as CategoryId);
}

// Stories about a natural disaster are news reports, not warnings. The UI
// uses this to point readers to the official alerts for anything urgent.
export function isHazardTopic(topic: TopicId): boolean {
  return topic === "earthquake" || topic === "weather";
}
