"use client";

import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import WeatherExperience from "@/components/weather/premium/WeatherExperience";
import type { WeatherSnapshot } from "@/lib/services/weather";

// Default view when no city is chosen: the visitor's own real location if they
// allowed it, otherwise the server-fetched Tokyo snapshot. Location is never
// forced — the fallback is always real Tokyo data.
export default function LiveWeatherPanel({ fallback }: { fallback: WeatherSnapshot }) {
  const { status, location, weather } = useLiveLocation();
  const live = status === "ready" && weather && location;

  if (live) {
    return (
      <WeatherExperience
        snapshot={weather}
        city={undefined}
        cityLabel={location.area ?? location.name}
        isLocationMode
      />
    );
  }

  return <WeatherExperience snapshot={fallback} city={undefined} cityLabel="Tokyo" isLocationMode={false} />;
}
