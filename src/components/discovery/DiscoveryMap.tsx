"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { AttributionControl, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import Link from "next/link";
import { meIcon, placeIcon } from "@/components/map/markerIcons";
import { placeName } from "@/lib/explore/display";
import type { Destination } from "@/lib/explore/types";
import { useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// The recommended places on the same dark Esri map the Map page uses.
function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 13 });
  }, [map, points]);
  return null;
}

export default function DiscoveryMap({ origin, places }: { origin: { lat: number; lon: number }; places: Destination[] }) {
  const { language } = useLanguage();
  const tr = useTranslate();
  const points = useMemo<[number, number][]>(() => [[origin.lat, origin.lon], ...places.map((p) => [p.lat, p.lon] as [number, number])], [origin, places]);

  return (
    <div className="lc-map lc-map--dark relative h-[22rem] w-full overflow-hidden rounded-2xl border border-glass-border">
      <MapContainer center={[origin.lat, origin.lon]} zoom={11} zoomControl attributionControl={false} className="h-full w-full" style={{ background: "#0a1024" }}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} maxZoom={16} />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} maxZoom={16} />
        <AttributionControl position="bottomright" prefix={`<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a> | Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community`} />
        <Fit points={points} />
        <Marker position={[origin.lat, origin.lon]} icon={meIcon()} interactive={false} />
        {places.map((p, i) => (
          <Marker key={p.id} position={[p.lat, p.lon]} icon={placeIcon(false, i + 1)}>
            <Tooltip direction="top" offset={[0, -8]}>
              {placeName(p, language)}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <ol className="pointer-events-none absolute left-2 top-2 z-[500] hidden max-h-[calc(100%-1rem)] w-52 flex-col gap-0.5 overflow-hidden rounded-xl border border-glass-border bg-[#0b0e1a]/85 p-2 text-[11px] text-foreground/85 backdrop-blur-sm sm:flex">
        {places.slice(0, 8).map((p, i) => (
          <li key={p.id} className="pointer-events-auto truncate">
            <Link href={`/explore/${p.id}`} className="hover:text-azure">
              {i + 1}. {placeName(p, language)}
            </Link>
          </li>
        ))}
      </ol>
      <span className="sr-only">{tr("Places on the map")}</span>
    </div>
  );
}
