import type { CommunityPlace, PlaceCategory } from "@/lib/community/placeTypes";

// What the place box in a form holds. A place is optional: `ref` is null for a
// typed name or no place at all. Everything else is filled only from a real place
// (never invented) so it can be shown before anything is published.
export interface PickedPlace {
  label: string;
  ref: string | null;
  areaId: string | null;
  address?: string | null;
  city?: string | null;
  category?: PlaceCategory | null;
  lat?: number | null;
  lon?: number | null;
}

export const NO_PLACE: PickedPlace = { label: "", ref: null, areaId: null };

export function pickedFrom(p: CommunityPlace): PickedPlace {
  return { label: p.name, ref: p.ref, areaId: p.areaId, address: p.address, city: p.city, category: p.category, lat: p.lat, lon: p.lon };
}
