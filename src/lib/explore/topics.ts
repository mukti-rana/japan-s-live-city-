import type { CategoryId } from "@/lib/explore/categories";

// The discovery topics on the Explore page. Each one is a filter over the real
// catalogue (catalogue categories, or the "hidden gem" / "family-friendly"
// flags), so a topic only ever lists places that exist in the data. A topic the
// open data cannot support is marked `unavailable` and says so.
export interface Topic {
  id: string;
  label: string; // English; translated when shown
  icon: string; // lucide icon name, resolved in the component
  cats: CategoryId[];
  hidden?: boolean;
  family?: boolean;
  unavailable?: string; // English explanation
  // Words that map a natural-language search onto this topic.
  words: string[];
}

export const TOPICS: Topic[] = [
  { id: "temples", label: "Shrines & Temples", icon: "Landmark", cats: ["shrine", "temple"], words: ["shrine", "shrines", "temple", "temples", "jinja", "tera", "buddhist", "shinto"] },
  { id: "history", label: "History & Culture", icon: "Castle", cats: ["castle", "attraction", "museum", "shrine", "temple"], words: ["history", "historic", "historical", "culture", "cultural", "castle", "castles", "heritage"] },
  { id: "nature", label: "Nature & Parks", icon: "Trees", cats: ["park", "waterfall", "lake", "gorge"], words: ["nature", "park", "parks", "garden", "gardens", "waterfall", "waterfalls", "lake", "lakes", "gorge", "forest"] },
  { id: "food", label: "Food & Restaurants", icon: "Utensils", cats: [], unavailable: "Restaurant listings aren't in our open data yet. Markets and food streets are under Shopping.", words: ["food", "restaurant", "restaurants", "eat", "ramen", "sushi"] },
  { id: "shopping", label: "Shopping", icon: "ShoppingBag", cats: ["market"], words: ["shopping", "shop", "shops", "market", "markets", "souvenir"] },
  { id: "entertainment", label: "Entertainment", icon: "Ticket", cats: ["themepark", "ski"], words: ["entertainment", "theme park", "themepark", "amusement", "rides", "ski", "skiing", "snowboard"] },
  { id: "views", label: "Observation & Architecture", icon: "Building2", cats: ["viewpoint", "attraction"], words: ["observation", "tower", "towers", "viewpoint", "views", "view", "skyline", "architecture", "skytree", "observatory"] },
  { id: "hidden", label: "Hidden Gems", icon: "Gem", cats: [], hidden: true, words: ["hidden", "secret", "quiet", "lesser-known", "off the beaten", "undiscovered"] },
  { id: "photo", label: "Photography Spots", icon: "Camera", cats: ["viewpoint", "waterfall", "lake", "gorge"], words: ["photo", "photos", "photography", "scenic", "instagram"] },
  { id: "outdoors", label: "Beaches & Mountains", icon: "Mountain", cats: ["beach", "mountain", "island"], words: ["beach", "beaches", "mountain", "mountains", "hiking", "hike", "island", "islands", "sea", "coast"] },
  { id: "museums", label: "Museums & Art", icon: "Palette", cats: ["museum"], words: ["museum", "museums", "art", "gallery", "galleries", "exhibition"] },
  { id: "family", label: "Family Activities", icon: "Users", cats: [], family: true, words: ["family", "families", "kids", "children", "aquarium", "zoo"] },
  { id: "unique", label: "Unique Experiences", icon: "Sparkles", cats: ["onsen", "ski", "island", "gorge"], words: ["onsen", "hot spring", "hot springs", "unique", "experience", "experiences", "bath", "ryokan"] },
  { id: "local", label: "Local Attractions", icon: "MapPinned", cats: ["attraction"], words: ["attraction", "attractions", "sightseeing", "landmark", "landmarks"] },
];

export const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

// The query parameters a set of chosen topics adds to /api/explore.
export function topicParams(ids: string[]): Record<string, string> {
  const chosen = ids.map((i) => TOPIC_BY_ID.get(i)).filter((t): t is Topic => Boolean(t) && !t!.unavailable);
  const out: Record<string, string> = {};
  const cats = [...new Set(chosen.flatMap((t) => t.cats))];
  if (cats.length > 0) out.cats = cats.join(",");
  // Flags only narrow when no category is chosen alongside them.
  if (cats.length === 0) {
    if (chosen.some((t) => t.hidden)) out.hidden = "1";
    if (chosen.some((t) => t.family)) out.family = "1";
  }
  return out;
}
