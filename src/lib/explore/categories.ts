import type { LanguageCode } from "@/lib/i18n/languages";
import { translate } from "@/lib/i18n/translate";

// What kinds of place the catalogue holds, and what can honestly be said about
// each *kind* of place. Nothing here is a fact about a single destination:
// indoor/outdoor, family-friendliness, typical season and typical visit length
// describe the type (a museum is indoors; an aquarium suits families) and are
// shown as "typical for this type of place".

export type CategoryId =
  | "shrine"
  | "temple"
  | "castle"
  | "museum"
  | "park"
  | "waterfall"
  | "mountain"
  | "beach"
  | "island"
  | "lake"
  | "gorge"
  | "onsen"
  | "aquarium"
  | "themepark"
  | "viewpoint"
  | "market"
  | "ski"
  | "attraction";

export type Season = "spring" | "summer" | "autumn" | "winter";

// "Things to do" groups people browse by.
export type GroupId = "culture" | "nature" | "adventure" | "family" | "entertainment" | "shopping" | "photography" | "relax";

type Labels = Partial<Record<LanguageCode, string>> & { en: string; ja: string };

export interface CategoryInfo {
  id: CategoryId;
  label: Labels;
  group: GroupId;
  // By type of place: indoors, outdoors, or either.
  setting: "indoor" | "outdoor" | "mixed";
  familyFriendly: boolean;
  // Seasons this kind of place is typically visited in (by type, not verified per place).
  seasons: Season[];
  // Typical time people spend at this kind of place, in hours [min, max].
  hours: [number, number];
  // Things people typically do at this kind of place.
  activities: Labels[];
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "shrine", label: { en: "Shrine", ja: "神社", zh: "神社", ko: "신사" }, group: "culture", setting: "outdoor", familyFriendly: false, seasons: ["spring", "autumn", "winter"], hours: [0.5, 1.5], activities: [{ en: "Walk the grounds and pay respects", ja: "境内を歩いて参拝する" }, { en: "Photography", ja: "写真撮影" }] },
  { id: "temple", label: { en: "Temple", ja: "寺院", zh: "寺院", ko: "사찰" }, group: "culture", setting: "outdoor", familyFriendly: false, seasons: ["spring", "autumn"], hours: [0.5, 2], activities: [{ en: "Visit the main hall and gardens", ja: "本堂や庭園を訪ねる" }, { en: "Photography", ja: "写真撮影" }] },
  { id: "castle", label: { en: "Castle", ja: "城", zh: "城堡", ko: "성" }, group: "culture", setting: "mixed", familyFriendly: true, seasons: ["spring", "autumn"], hours: [1, 3], activities: [{ en: "Explore the castle grounds", ja: "城跡・城郭を巡る" }, { en: "Learn local history", ja: "地域の歴史を学ぶ" }] },
  { id: "museum", label: { en: "Museum", ja: "博物館・美術館", zh: "博物馆", ko: "박물관" }, group: "culture", setting: "indoor", familyFriendly: true, seasons: ["spring", "summer", "autumn", "winter"], hours: [1, 3], activities: [{ en: "See the exhibitions", ja: "展示を見る" }, { en: "Learn about art, history or science", ja: "芸術・歴史・科学に触れる" }] },
  { id: "park", label: { en: "Park & garden", ja: "公園・庭園", zh: "公园·庭园", ko: "공원·정원" }, group: "nature", setting: "outdoor", familyFriendly: true, seasons: ["spring", "autumn"], hours: [1, 3], activities: [{ en: "Stroll and relax", ja: "散策してくつろぐ" }, { en: "Seasonal flowers and leaves", ja: "季節の花や紅葉を楽しむ" }] },
  { id: "waterfall", label: { en: "Waterfall", ja: "滝", zh: "瀑布", ko: "폭포" }, group: "nature", setting: "outdoor", familyFriendly: false, seasons: ["summer", "autumn"], hours: [0.5, 2], activities: [{ en: "Walk to the falls", ja: "滝まで歩く" }, { en: "Photography", ja: "写真撮影" }] },
  { id: "mountain", label: { en: "Mountain", ja: "山", zh: "山", ko: "산" }, group: "adventure", setting: "outdoor", familyFriendly: false, seasons: ["summer", "autumn"], hours: [3, 8], activities: [{ en: "Hiking", ja: "ハイキング・登山" }, { en: "Scenic views", ja: "眺望を楽しむ" }] },
  { id: "beach", label: { en: "Beach", ja: "ビーチ・海岸", zh: "海滩", ko: "해변" }, group: "nature", setting: "outdoor", familyFriendly: true, seasons: ["summer"], hours: [2, 5], activities: [{ en: "Seaside walks", ja: "海辺の散歩" }, { en: "Swimming in summer where permitted", ja: "夏は許可された場所で海水浴" }] },
  { id: "island", label: { en: "Island", ja: "島", zh: "岛屿", ko: "섬" }, group: "adventure", setting: "outdoor", familyFriendly: true, seasons: ["spring", "summer", "autumn"], hours: [3, 8], activities: [{ en: "Explore by ferry or bridge", ja: "フェリーや橋で島を巡る" }, { en: "Coastal scenery", ja: "海岸の景色" }] },
  { id: "lake", label: { en: "Lake", ja: "湖", zh: "湖泊", ko: "호수" }, group: "nature", setting: "outdoor", familyFriendly: true, seasons: ["spring", "summer", "autumn"], hours: [1, 4], activities: [{ en: "Lakeside walks", ja: "湖畔の散策" }, { en: "Scenic views", ja: "眺望を楽しむ" }] },
  { id: "gorge", label: { en: "Gorge & river", ja: "渓谷・川", zh: "峡谷·河流", ko: "계곡·강" }, group: "nature", setting: "outdoor", familyFriendly: false, seasons: ["summer", "autumn"], hours: [1, 4], activities: [{ en: "Riverside walks", ja: "渓谷沿いの散策" }, { en: "Photography", ja: "写真撮影" }] },
  { id: "onsen", label: { en: "Hot spring", ja: "温泉", zh: "温泉", ko: "온천" }, group: "relax", setting: "mixed", familyFriendly: false, seasons: ["autumn", "winter"], hours: [1, 3], activities: [{ en: "Hot spring bathing", ja: "温泉入浴" }, { en: "Relax in a hot spring town", ja: "温泉街でのんびり" }] },
  { id: "aquarium", label: { en: "Aquarium & zoo", ja: "水族館・動物園", zh: "水族馆·动物园", ko: "수족관·동물원" }, group: "family", setting: "mixed", familyFriendly: true, seasons: ["spring", "summer", "autumn", "winter"], hours: [2, 4], activities: [{ en: "See the animals and exhibits", ja: "動物や展示を見る" }, { en: "Family outing", ja: "家族でお出かけ" }] },
  { id: "themepark", label: { en: "Theme park", ja: "テーマパーク", zh: "主题公园", ko: "테마파크" }, group: "entertainment", setting: "outdoor", familyFriendly: true, seasons: ["spring", "summer", "autumn"], hours: [4, 9], activities: [{ en: "Rides and attractions", ja: "アトラクションを楽しむ" }, { en: "Family outing", ja: "家族でお出かけ" }] },
  { id: "viewpoint", label: { en: "Viewpoint & tower", ja: "展望・タワー", zh: "观景台·塔", ko: "전망대·타워" }, group: "photography", setting: "mixed", familyFriendly: true, seasons: ["spring", "summer", "autumn", "winter"], hours: [0.5, 1.5], activities: [{ en: "Panoramic views", ja: "パノラマの眺望" }, { en: "Night views after dark", ja: "夜景を見る" }] },
  { id: "market", label: { en: "Market & shopping", ja: "市場・商店街", zh: "市场·商店街", ko: "시장·상점가" }, group: "shopping", setting: "mixed", familyFriendly: true, seasons: ["spring", "summer", "autumn", "winter"], hours: [1, 3], activities: [{ en: "Browse local shops", ja: "地元のお店を巡る" }, { en: "Try local food", ja: "ご当地グルメを味わう" }] },
  { id: "ski", label: { en: "Ski resort", ja: "スキー場", zh: "滑雪场", ko: "스키장" }, group: "adventure", setting: "outdoor", familyFriendly: true, seasons: ["winter"], hours: [4, 8], activities: [{ en: "Skiing and snowboarding", ja: "スキー・スノーボード" }] },
  { id: "attraction", label: { en: "Attraction", ja: "名所", zh: "景点", ko: "명소" }, group: "culture", setting: "mixed", familyFriendly: false, seasons: ["spring", "summer", "autumn", "winter"], hours: [1, 3], activities: [{ en: "Sightseeing", ja: "観光" }] },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export const GROUPS: { id: GroupId; label: Labels }[] = [
  { id: "culture", label: { en: "Culture & history", ja: "文化・歴史", zh: "文化与历史", ko: "문화·역사" } },
  { id: "nature", label: { en: "Nature & outdoors", ja: "自然・アウトドア", zh: "自然与户外", ko: "자연·야외" } },
  { id: "adventure", label: { en: "Adventure & sports", ja: "アドベンチャー・スポーツ", zh: "探险与运动", ko: "모험·스포츠" } },
  { id: "family", label: { en: "Family activities", ja: "ファミリー向け", zh: "亲子活动", ko: "가족 활동" } },
  { id: "entertainment", label: { en: "Entertainment", ja: "エンターテインメント", zh: "娱乐", ko: "엔터테인먼트" } },
  { id: "shopping", label: { en: "Shopping & food", ja: "買い物・グルメ", zh: "购物与美食", ko: "쇼핑·미식" } },
  { id: "photography", label: { en: "Photography & views", ja: "絶景・撮影スポット", zh: "摄影与景观", ko: "촬영·전망" } },
  { id: "relax", label: { en: "Hot springs & relaxing", ja: "温泉・くつろぎ", zh: "温泉与放松", ko: "온천·휴식" } },
];

export const SEASONS: { id: Season; label: Labels }[] = [
  { id: "spring", label: { en: "Spring", ja: "春", zh: "春", ko: "봄" } },
  { id: "summer", label: { en: "Summer", ja: "夏", zh: "夏", ko: "여름" } },
  { id: "autumn", label: { en: "Autumn", ja: "秋", zh: "秋", ko: "가을" } },
  { id: "winter", label: { en: "Winter", ja: "冬", zh: "冬", ko: "겨울" } },
];

export function pickLabel(labels: Labels, language: LanguageCode): string {
  return labels[language] ?? translate(labels.en, language);
}

// Meteorological seasons in Japan, from the month (1–12).
export function seasonOfMonth(month: number): Season {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}
