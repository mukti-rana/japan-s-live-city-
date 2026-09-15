"use client";

import dynamic from "next/dynamic";
import type { CityWithWeather } from "@/components/map/JapanMap";

const JapanMap = dynamic(() => import("@/components/map/JapanMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0a1024] text-sm text-muted">
      Loading map…
    </div>
  ),
});

export default function MapLoader({ cities }: { cities: CityWithWeather[] }) {
  return <JapanMap cities={cities} />;
}
