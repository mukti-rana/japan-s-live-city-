import type { Destination } from "@/lib/explore/types";

// Home's small preview of nearby discovery: the best few places within reach.
export function previewParams(opts: { lat: number; lon: number; language: string }): string {
  return new URLSearchParams({ lat: String(opts.lat), lon: String(opts.lon), radius: "25", sort: "recommended", limit: "10", lang: opts.language }).toString();
}

// A different place each day among the best few, so Home doesn't show the
// same one every visit. Stable within a day.
export function featuredOf(items: Destination[], dayNumber: number): Destination | null {
  const withPhoto = items.filter((d) => d.image).slice(0, 6);
  const pool = withPhoto.length > 0 ? withPhoto : items.slice(0, 1);
  return pool.length > 0 ? pool[dayNumber % pool.length] : null;
}

export const directionsUrl = (d: Pick<Destination, "lat" | "lon">) => `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lon}`;

// Wikipedia language editions → "popular" only when it's really widespread.
export const WIDELY_KNOWN = 20;
