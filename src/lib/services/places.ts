// Enriches the curated places list with real one-line descriptions from
// Wikipedia's free, keyless summary API — replacing invented "open now" /
// visitor-count stats with something honest and verifiable.

import { POPULAR_PLACES, type PlaceInfo } from "@/lib/data/places";

export interface EnrichedPlace extends PlaceInfo {
  description: string | null;
  wikipediaUrl: string;
}

interface WikiSummary {
  description?: string;
  content_urls?: { desktop?: { page?: string } };
}

async function fetchSummary(place: PlaceInfo): Promise<EnrichedPlace> {
  const fallbackUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(place.wikipediaTitle)}`;

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.wikipediaTitle)}`,
      {
        next: { revalidate: 86400 },
        headers: { "User-Agent": "LiveCityJapan/1.0 (educational project)" },
      },
    );

    if (!res.ok) {
      return { ...place, description: null, wikipediaUrl: fallbackUrl };
    }

    const data = (await res.json()) as WikiSummary;

    return {
      ...place,
      description: data.description ?? null,
      wikipediaUrl: data.content_urls?.desktop?.page ?? fallbackUrl,
    };
  } catch {
    return { ...place, description: null, wikipediaUrl: fallbackUrl };
  }
}

export async function getPopularPlaces(): Promise<EnrichedPlace[]> {
  return Promise.all(POPULAR_PLACES.map(fetchSummary));
}
