import type { Metadata } from "next";
import MapLoader from "@/components/map/MapLoader";
import PageHero from "@/components/page/PageHero";

export const metadata: Metadata = {
  title: "Japan Map — Live City Japan",
  description:
    "Interactive map of Japan: live weather for major cities, events with known locations and official JMA alerts. Search cities and prefectures, switch between a dark map and satellite imagery.",
};

// Everything on the map is loaded in the browser, layer by layer, from the
// site's own cached endpoints — the page itself stays static.
export default function MapPage() {
  return (
    <div className="flex flex-col gap-3">
      <PageHero size="compact" titleKey="nav.map" introKey="map.subtitle" />
      <div className="h-[calc(100dvh-12.5rem)] min-h-[520px] overflow-hidden rounded-2xl border border-glass-border bg-[#0a1024] shadow-[0_0_60px_-30px_rgba(77,163,255,0.5)]">
        <MapLoader />
      </div>
    </div>
  );
}
