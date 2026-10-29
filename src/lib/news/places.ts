// Japan's 47 prefectures with the names a news story is likely to use for
// them (English and Japanese) plus their best-known cities. This is how a
// story is tied to a place: by finding a real place name in the publisher's
// own headline or summary — never by guessing. A story that names no place
// simply has no place.

export type RegionId = "hokkaido" | "tohoku" | "kanto" | "chubu" | "kansai" | "chugoku" | "shikoku" | "kyushu";

export interface Prefecture {
  id: string;
  en: string;
  ja: string;
  region: RegionId;
  // English / Japanese tokens that identify this prefecture or a city in it.
  enTokens: string[];
  jaTokens: string[];
}

function p(
  id: string,
  en: string,
  ja: string,
  region: RegionId,
  cities: string[],
  jaTokens: string[],
  strict = false,
): Prefecture {
  // "strict" names (Kochi, Saga) are common words elsewhere, so they only
  // count when written as "<name> Prefecture".
  const enTokens = strict ? [`${en} Prefecture`, ...cities] : [en, ...cities];
  return { id, en, ja, region, enTokens, jaTokens };
}

export const PREFECTURES: Prefecture[] = [
  p("hokkaido", "Hokkaido", "北海道", "hokkaido", ["Sapporo", "Hakodate", "Asahikawa", "Otaru"], ["北海道", "札幌", "函館", "旭川", "小樽"]),
  p("aomori", "Aomori", "青森", "tohoku", ["Hachinohe"], ["青森県", "青森市", "八戸"]),
  p("iwate", "Iwate", "岩手", "tohoku", ["Morioka"], ["岩手県", "盛岡"]),
  p("miyagi", "Miyagi", "宮城", "tohoku", ["Sendai"], ["宮城県", "仙台"]),
  p("akita", "Akita", "秋田", "tohoku", [], ["秋田県", "秋田市"]),
  p("yamagata", "Yamagata", "山形", "tohoku", [], ["山形県", "山形市"]),
  p("fukushima", "Fukushima", "福島", "tohoku", ["Koriyama", "Iwaki"], ["福島県", "福島市", "郡山市"]),
  p("ibaraki", "Ibaraki", "茨城", "kanto", ["Mito", "Tsukuba"], ["茨城県", "水戸", "つくば"]),
  p("tochigi", "Tochigi", "栃木", "kanto", ["Utsunomiya", "Nikko"], ["栃木県", "宇都宮", "日光"]),
  p("gunma", "Gunma", "群馬", "kanto", ["Maebashi", "Takasaki"], ["群馬県", "前橋", "高崎"]),
  p("saitama", "Saitama", "埼玉", "kanto", ["Kawagoe"], ["埼玉", "さいたま市", "川口"]),
  p("chiba", "Chiba", "千葉", "kanto", ["Narita", "Funabashi"], ["千葉", "成田", "船橋"]),
  p("tokyo", "Tokyo", "東京", "kanto", ["Shibuya", "Shinjuku", "Ginza", "Roppongi", "Ikebukuro", "Akihabara", "Asakusa", "Ueno", "Shinagawa", "Setagaya", "Hachioji"], ["東京", "渋谷", "新宿", "銀座", "六本木", "池袋", "秋葉原", "浅草", "上野", "品川", "世田谷", "八王子", "首都高"]),
  p("kanagawa", "Kanagawa", "神奈川", "kanto", ["Yokohama", "Kawasaki", "Kamakura", "Hakone"], ["神奈川", "横浜", "川崎市", "鎌倉", "箱根"]),
  p("niigata", "Niigata", "新潟", "chubu", [], ["新潟"]),
  p("toyama", "Toyama", "富山", "chubu", [], ["富山県", "富山市"]),
  p("ishikawa", "Ishikawa", "石川", "chubu", ["Kanazawa", "Noto"], ["石川県", "金沢", "能登"]),
  p("fukui", "Fukui", "福井", "chubu", [], ["福井県", "福井市"]),
  p("yamanashi", "Yamanashi", "山梨", "chubu", ["Kofu"], ["山梨県", "甲府"]),
  p("nagano", "Nagano", "長野", "chubu", ["Matsumoto", "Karuizawa"], ["長野県", "長野市", "松本"]),
  p("gifu", "Gifu", "岐阜", "chubu", ["Takayama"], ["岐阜"]),
  p("shizuoka", "Shizuoka", "静岡", "chubu", ["Hamamatsu", "Atami"], ["静岡", "浜松", "熱海"]),
  p("aichi", "Aichi", "愛知", "chubu", ["Nagoya"], ["愛知", "名古屋", "豊田市"]),
  p("mie", "Mie", "三重", "kansai", ["Ise", "Yokkaichi"], ["三重県", "伊勢", "四日市"]),
  p("shiga", "Shiga", "滋賀", "kansai", ["Otsu", "Hikone"], ["滋賀", "大津市", "彦根"]),
  p("kyoto", "Kyoto", "京都", "kansai", ["Uji"], ["京都", "宇治"]),
  p("osaka", "Osaka", "大阪", "kansai", ["Sakai", "Umeda", "Namba", "Dotonbori", "Tennoji", "Suita", "Toyonaka", "Higashiosaka"], ["大阪", "堺市", "梅田", "難波"]),
  p("hyogo", "Hyogo", "兵庫", "kansai", ["Kobe", "Himeji", "Nishinomiya", "Amagasaki"], ["兵庫", "神戸", "姫路", "西宮", "尼崎"]),
  p("nara", "Nara", "奈良", "kansai", [], ["奈良"]),
  p("wakayama", "Wakayama", "和歌山", "kansai", [], ["和歌山"]),
  p("tottori", "Tottori", "鳥取", "chugoku", [], ["鳥取"]),
  p("shimane", "Shimane", "島根", "chugoku", ["Matsue", "Izumo"], ["島根", "松江", "出雲"]),
  p("okayama", "Okayama", "岡山", "chugoku", ["Kurashiki"], ["岡山", "倉敷"]),
  p("hiroshima", "Hiroshima", "広島", "chugoku", ["Fukuyama"], ["広島"]),
  p("yamaguchi", "Yamaguchi", "山口", "chugoku", ["Shimonoseki"], ["山口県", "下関"]),
  p("tokushima", "Tokushima", "徳島", "shikoku", [], ["徳島"]),
  p("kagawa", "Kagawa", "香川", "shikoku", ["Takamatsu"], ["香川", "高松"]),
  p("ehime", "Ehime", "愛媛", "shikoku", ["Matsuyama"], ["愛媛", "松山市"]),
  p("kochi", "Kochi", "高知", "shikoku", [], ["高知"], true),
  p("fukuoka", "Fukuoka", "福岡", "kyushu", ["Kitakyushu", "Hakata"], ["福岡", "北九州", "博多"]),
  p("saga", "Saga", "佐賀", "kyushu", [], ["佐賀"], true),
  p("nagasaki", "Nagasaki", "長崎", "kyushu", [], ["長崎"]),
  p("kumamoto", "Kumamoto", "熊本", "kyushu", [], ["熊本"]),
  p("oita", "Oita", "大分", "kyushu", ["Beppu"], ["大分", "別府"]),
  p("miyazaki", "Miyazaki", "宮崎", "kyushu", [], ["宮崎"]),
  p("kagoshima", "Kagoshima", "鹿児島", "kyushu", ["Sakurajima"], ["鹿児島", "桜島"]),
  p("okinawa", "Okinawa", "沖縄", "kyushu", ["Naha"], ["沖縄", "那覇"]),
];

const PREFECTURE_BY_ID = new Map(PREFECTURES.map((pref) => [pref.id, pref]));

export function getPrefecture(id: string): Prefecture | undefined {
  return PREFECTURE_BY_ID.get(id);
}

// Phrases that contain a place name but aren't about that place — "Tokyo
// Stock Exchange", "Kyoto Protocol" — are removed before matching so they
// don't make a markets story look like Tokyo local news.
const NOISE =
  /Tokyo (Stock Exchange|Electric|Gas|Olympics?|Paralympics?|Shimbun|Broadcasting|Metro)|Nikkei|Kyoto (Protocol|Animation)|Osaka Gas|東京証券取引所|東京電力|東京オリンピック|東京五輪|東京株式|日経/gi;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EN_MATCHERS = PREFECTURES.map((pref) => ({
  id: pref.id,
  re: new RegExp(`\\b(?:${pref.enTokens.map(escapeRegExp).join("|")})\\b`, "i"),
  // City-level tokens only (everything except the prefecture's own name).
  cityRe:
    pref.enTokens.length > 1
      ? new RegExp(`\\b(?:${pref.enTokens.slice(1).map(escapeRegExp).join("|")})\\b`, "i")
      : null,
}));

const JA_MATCHERS = PREFECTURES.map((pref) => ({
  id: pref.id,
  re: new RegExp(pref.jaTokens.map(escapeRegExp).join("|")),
}));

// Every prefecture whose name (or a well-known city's name) appears in the
// text, in the order they first appear — so the first one is the place the
// headline leads with.
export function detectPlaces(text: string): string[] {
  let clean = text.replace(NOISE, " ");
  // A story about the tennis player Naomi Osaka uses her surname on its own
  // ("Osaka got off to a good start"), which isn't the city.
  if (/Naomi Osaka|Osaka Naomi|大坂なおみ/i.test(text)) clean = clean.replace(/\bOsaka\b/gi, " ");
  const found: { id: string; at: number }[] = [];
  EN_MATCHERS.forEach((m, i) => {
    const at = clean.search(m.re);
    const jaAt = clean.search(JA_MATCHERS[i].re);
    const first = [at, jaAt].filter((n) => n >= 0);
    if (first.length) found.push({ id: m.id, at: Math.min(...first) });
  });
  return found.sort((a, b) => a.at - b.at).map((f) => f.id);
}

export interface ResolvedPlace {
  prefectureId: string;
  prefectureName: string;
  // The city the visitor is in, when it is more specific than the prefecture.
  city: string | null;
}

// Turns a place name from the visitor's location or city picker ("Osaka",
// "Tennoji-ku", "Osaka Prefecture", "Kobe") into a prefecture, if it is one
// we recognise. Returns null otherwise — the caller then asks the visitor to
// pick a city rather than guessing.
export function resolvePlace(name: string | null | undefined): ResolvedPlace | null {
  if (!name) return null;
  const raw = name.trim();
  if (!raw) return null;
  const base = raw
    .replace(/\s+(Prefecture|Metropolis|City)$/i, "")
    .replace(/-(shi|ku|city)$/i, "")
    .trim();
  const lower = base.toLowerCase();

  for (const pref of PREFECTURES) {
    if (pref.en.toLowerCase() === lower || pref.ja === base) {
      return { prefectureId: pref.id, prefectureName: pref.en, city: null };
    }
  }
  for (const pref of PREFECTURES) {
    const city = pref.enTokens.slice(1).find((t) => t.toLowerCase() === lower);
    if (city) return { prefectureId: pref.id, prefectureName: pref.en, city };
  }
  return null;
}

export type MatchLevel = 0 | 1 | 2 | 3;

// How close a story is to the visitor's place:
//   3 = names their city, 2 = names their prefecture,
//   1 = names a neighbouring prefecture in the same region, 0 = unrelated.
export function matchLevel(
  place: ResolvedPlace,
  titleAndSummary: string,
  articlePlaces: string[],
): MatchLevel {
  const own = getPrefecture(place.prefectureId);
  if (!own) return 0;
  if (place.city) {
    const cityRe = new RegExp(`\\b${escapeRegExp(place.city)}\\b`, "i");
    if (cityRe.test(titleAndSummary)) return 3;
  } else if (articlePlaces.includes(place.prefectureId)) {
    // Prefecture and city share a name (Osaka, Tokyo, Kyoto…): a mention is
    // as close as the text can tell us.
    return 3;
  }
  if (articlePlaces.includes(place.prefectureId)) return 2;
  const sameRegion = articlePlaces.some((id) => getPrefecture(id)?.region === own.region);
  return sameRegion ? 1 : 0;
}
