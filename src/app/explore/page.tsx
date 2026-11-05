import type { Metadata } from "next";
import ExploreApp from "@/components/explore/ExploreApp";
import { catalogueStats } from "@/lib/explore/catalogue";

export const metadata: Metadata = {
  title: "Explore Japan — Live City Japan",
  description:
    "Discover places and things to do across all 47 prefectures of Japan — near you, in your prefecture, or anywhere in the country. Temples, castles, onsen, mountains, museums and hidden gems.",
};

// No location is requested here: the visitor starts it with a button, and the
// page works without one (All Japan).
export default function ExplorePage() {
  return <ExploreApp meta={catalogueStats()} />;
}
