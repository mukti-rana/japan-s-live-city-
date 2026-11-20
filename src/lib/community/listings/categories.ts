// The categories of What's Happening. The same list is seeded into the database (community_listing_categories, migration 0013); this copy
// lets the pages render filters without an extra request.

export interface ListingCategory {
  slug: string;
  en: string;
  ja: string;
}

export const LISTING_CATEGORIES: ListingCategory[] = [
  { slug: "concerts-music", en: "Concerts & Music", ja: "コンサート・音楽" },
  { slug: "festivals-matsuri", en: "Festivals & Matsuri", ja: "祭り・フェスティバル" },
  { slug: "fireworks", en: "Fireworks", ja: "花火" },
  { slug: "food-markets", en: "Food & Markets", ja: "グルメ・マーケット" },
  { slug: "exhibitions-art", en: "Exhibitions & Art", ja: "展覧会・アート" },
  { slug: "workshops-classes", en: "Workshops & Classes", ja: "ワークショップ・教室" },
  { slug: "sports", en: "Sports", ja: "スポーツ" },
  { slug: "school-university", en: "School & University Events", ja: "学校・大学のイベント" },
  { slug: "community-meetups", en: "Community Meetups", ja: "交流会・ミートアップ" },
  { slug: "business-promotions", en: "Business Promotions", ja: "お店・ビジネスのプロモーション" },
  { slug: "seasonal-activities", en: "Seasonal Activities", ja: "季節のアクティビティ" },
  { slug: "local-announcements", en: "Local Announcements", ja: "地域のお知らせ" },
  { slug: "other", en: "Other", ja: "その他" },
];

export const LISTING_CATEGORY_BY_SLUG = new Map(LISTING_CATEGORIES.map((c) => [c.slug, c]));
export const isListingCategory = (slug: unknown): slug is string => typeof slug === "string" && LISTING_CATEGORY_BY_SLUG.has(slug);
