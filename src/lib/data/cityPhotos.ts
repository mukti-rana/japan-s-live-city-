import { HOME_PHOTOS, type HomePhoto } from "@/lib/data/homePhotos";

// The photographs the hero rotates through for each city (by HERO_CITIES slug).
// Only real photographs of that place belong here — a city with none simply has no
// entry and the hero keeps its quiet gradient. The hero shows them in this order, so
// the first one is the one a visitor sees first (and the one that is preloaded).
export const CITY_PHOTOS: Record<string, readonly HomePhoto[]> = {
  tokyo: [HOME_PHOTOS.hero],
  kyoto: [HOME_PHOTOS.fushimi, HOME_PHOTOS.kiyomizu],
  osaka: [HOME_PHOTOS.dotonbori],
  nara: [HOME_PHOTOS.todaiji],
  hiroshima: [HOME_PHOTOS.itsukushima],
};
