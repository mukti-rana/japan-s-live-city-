"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import Thumb from "@/components/ui/Thumb";
import type { EnrichedPlace } from "@/lib/services/places";
import type { PlaceCity } from "@/lib/data/places";

const CITY_TABS: PlaceCity[] = [
  "Tokyo",
  "Kyoto",
  "Osaka",
  "Nara",
  "Hiroshima",
  "Hokkaido",
  "Gifu",
  "Kanazawa",
  "Okinawa",
];

export default function PopularPlacesGrid({ places }: { places: EnrichedPlace[] }) {
  const [city, setCity] = useState<PlaceCity>("Tokyo");

  const filtered = places.filter((p) => p.city === city);

  return (
    <div className="flex flex-col gap-3">
      <Tabs tabs={CITY_TABS} value={city} onChange={(t) => setCity(t as PlaceCity)} />

      <div className="grid grid-cols-3 gap-2">
        {filtered.map((place) => (
          <a
            key={place.name}
            href={place.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group min-w-0"
          >
            <Thumb
              gradient={place.gradient}
              icon={Landmark}
              src={place.image}
              alt={place.name}
              className="h-20 w-full"
            />
            <p className="mt-1.5 truncate text-[11px] font-medium text-foreground group-hover:text-azure">
              {place.name}
            </p>
            <p className="truncate text-[9px] text-muted">
              {place.description ?? place.city}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
