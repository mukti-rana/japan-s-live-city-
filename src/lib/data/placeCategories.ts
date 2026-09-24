import { Landmark, Castle, Trees, Building2, Telescope, type LucideIcon } from "lucide-react";
import type { PlaceCategory } from "@/lib/data/places";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

export const PLACE_CATEGORY_META: Record<PlaceCategory, { icon: LucideIcon; labelKey: TranslationKey }> = {
  shrineTemple: { icon: Landmark, labelKey: "explore.category.shrineTemple" },
  historyCulture: { icon: Castle, labelKey: "explore.category.historyCulture" },
  natureParks: { icon: Trees, labelKey: "explore.category.natureParks" },
  cityscape: { icon: Building2, labelKey: "explore.category.cityscape" },
  observation: { icon: Telescope, labelKey: "explore.category.observation" },
};

// Fixed, deliberate order (roughly most-to-least represented in the
// current real data) rather than object key order, which isn't guaranteed
// stable across engines for string keys in the general case.
export const PLACE_CATEGORY_ORDER: PlaceCategory[] = [
  "shrineTemple",
  "historyCulture",
  "natureParks",
  "cityscape",
  "observation",
];
