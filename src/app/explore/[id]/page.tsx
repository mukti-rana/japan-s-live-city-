import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlaceDetail from "@/components/explore/PlaceDetail";
import { catalogueStats, getDestination, nearbyTo } from "@/lib/explore/catalogue";

// Places are rendered on demand from the catalogue (there can be thousands),
// not generated ahead of time.
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/explore/[id]">): Promise<Metadata> {
  const { id } = await params;
  const place = getDestination(id);
  if (!place) return {};
  const name = place.names.en ?? place.names.ja ?? "Destination";
  return {
    title: `${name} — Explore Japan`,
    description: place.abouts.en?.text.slice(0, 160) ?? `${name}, a ${place.category} in Japan. Photos, location and nearby places.`,
  };
}

export default async function PlacePage({ params }: PageProps<"/explore/[id]">) {
  const { id } = await params;
  const place = getDestination(id);
  if (!place) notFound();
  return <PlaceDetail place={place} nearby={nearbyTo(id)} checkedOn={catalogueStats().generatedAt} />;
}
