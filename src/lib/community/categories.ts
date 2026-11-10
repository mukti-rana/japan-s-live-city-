// The topics a community post can belong to. The same list is seeded into the
// database (community_categories), where moderators can later add or hide
// topics; this copy lets the pages render filters without an extra request.

export interface CommunityCategory {
  slug: string;
  en: string;
  ja: string;
}

export const CATEGORIES: CommunityCategory[] = [
  { slug: "nature", en: "Nature", ja: "自然" },
  { slug: "food", en: "Food", ja: "グルメ" },
  { slug: "culture", en: "Culture", ja: "文化" },
  { slug: "temples-shrines", en: "Temples & Shrines", ja: "寺社" },
  { slug: "shopping", en: "Shopping", ja: "ショッピング" },
  { slug: "nightlife", en: "Nightlife", ja: "ナイトライフ" },
  { slug: "festivals", en: "Festivals", ja: "祭り" },
  { slug: "architecture", en: "Architecture", ja: "建築" },
  { slug: "photography", en: "Photography", ja: "写真" },
  { slug: "hidden-places", en: "Hidden Places", ja: "穴場" },
  { slug: "activities", en: "Activities", ja: "アクティビティ" },
  { slug: "local-experiences", en: "Local Experiences", ja: "地元体験" },
  { slug: "seasonal", en: "Seasonal Experiences", ja: "季節の体験" },
];

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function isCategorySlug(value: string | undefined): value is string {
  return Boolean(value && CATEGORY_BY_SLUG.has(value));
}
