import { BedDouble, Coffee, Dumbbell, Landmark, MapPin, Scissors, ShoppingBag, Store, Utensils, type LucideIcon } from "lucide-react";
import type { PlaceCategory } from "@/lib/community/placeTypes";

const ICONS: Record<PlaceCategory, LucideIcon> = {
  attraction: Landmark,
  restaurant: Utensils,
  cafe: Coffee,
  hotel: BedDouble,
  shopping: ShoppingBag,
  department_store: Store,
  gym: Dumbbell,
  salon: Scissors,
  other: MapPin,
};

// The small picture for a kind of place (restaurant, cafe, hotel…).
export default function PlaceTypeIcon({ category, size = 15, className }: { category: PlaceCategory; size?: number; className?: string }) {
  const Icon = ICONS[category] ?? MapPin;
  return <Icon size={size} aria-hidden="true" className={className} />;
}
