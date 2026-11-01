import type { Metadata } from "next";
import MapLoader from "@/components/map/MapLoader";
import T from "@/components/i18n/T";

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          <T k="nav.map" />
        </h1>
        <p className="text-xs text-muted">
          <T k="map.subtitle" />
        </p>
      </div>
      <div className="h-[calc(100dvh-8.75rem)] min-h-[520px] overflow-hidden rounded-2xl border border-glass-border bg-[#0a1024] shadow-[0_0_60px_-30px_rgba(77,163,255,0.5)]">
        <MapLoader />
      </div>
    </div>
  );
}
