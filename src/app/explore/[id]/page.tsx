import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlaceDetail from "@/components/explore/PlaceDetail";
import PlaceCommunity from "@/components/community/PlaceCommunity";
import { catalogueStats, getDestination, nearbyTo } from "@/lib/explore/catalogue";

// Places are rendered on demand from the catalogue (there can be thousands),
// not generated ahead of time.
export const dynamicParams = true;

// Reviews and photos from the community show on this page, so it is rebuilt at
// most every five minutes (a new review appears within that time).
export const revalidate = 300;

// No place is built ahead of time (there are thousands); returning an empty list
// is what lets Next cache each page the first time it is visited and refresh it
// on the schedule above.
export async function generateStaticParams() {
  return [];
}

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
  return (
    <>
      <PlaceDetail place={place} nearby={nearbyTo(id)} checkedOn={catalogueStats().generatedAt} />
      <PlaceCommunity id={id} />
    </>
  );
}
