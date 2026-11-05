import { Anchor, Castle, Compass, Eye, Fish, Flower2, Landmark, Mountain, Snowflake, Store, Sun, TentTree, Waves, Droplets, FerrisWheel, Waypoints, type LucideIcon } from "lucide-react";
import type { CategoryId } from "@/lib/explore/categories";

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  shrine: Landmark,
  temple: Landmark,
  castle: Castle,
  museum: Landmark,
  park: Flower2,
  waterfall: Droplets,
  mountain: Mountain,
  beach: Sun,
  island: Anchor,
  lake: Waves,
  gorge: Waypoints,
  onsen: TentTree,
  aquarium: Fish,
  themepark: FerrisWheel,
  viewpoint: Eye,
  market: Store,
  ski: Snowflake,
  attraction: Compass,
};

// Gradient pair for a destination without a photograph.
export const CATEGORY_TONE: Record<CategoryId, [string, string, string]> = {
  shrine: ["#3a2270", "#0e1236", "#f59ac0"],
  temple: ["#2f2373", "#0e1236", "#bba6ff"],
  castle: ["#1d2f6b", "#0d1533", "#8fb0ff"],
  museum: ["#16376a", "#0d1634", "#7ed3ff"],
  park: ["#14504a", "#0c1830", "#7ae8b8"],
  waterfall: ["#1b3f78", "#0c1432", "#94cdff"],
  mountain: ["#243a74", "#0d1433", "#a7c0ff"],
  beach: ["#17507a", "#0c1632", "#ffd884"],
  island: ["#194a86", "#0d1535", "#86e6ff"],
  lake: ["#16406f", "#0c1532", "#86d8ff"],
  gorge: ["#1c4a5f", "#0c1630", "#7be0c8"],
  onsen: ["#4a2570", "#0f1236", "#ffb0d6"],
  aquarium: ["#10426a", "#0c1430", "#6be6ff"],
  themepark: ["#512478", "#0f1236", "#ff92dc"],
  viewpoint: ["#2a2a78", "#0b1433", "#ffd27a"],
  market: ["#44286a", "#0e1230", "#ffa97a"],
  ski: ["#1f3f7a", "#0c1534", "#cfe6ff"],
  attraction: ["#212f63", "#0d1331", "#a2b8ff"],
};
