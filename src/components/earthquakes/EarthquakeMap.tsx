"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { AttributionControl, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { QuakeDetail } from "@/lib/services/earthquake";
import { shindoColor } from "@/components/earthquakes/quakeStyle";

// Where the earthquakes began: one circle per quake on the site's dark Esri map, sized by magnitude and coloured by the strongest shindo.
// The newest quake and the selected one carry a pulsing ring; choosing a quake (here or in the list) flies the map to it.
const BOUNDS = L.latLngBounds([30.2, 128.0], [45.8, 146.6]);
const MAX_BOUNDS = L.latLngBounds([14, 108], [56, 168]);

const ringIcon = (color: string, size: number, still: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="eq-ring${still ? " eq-ring--still" : ""}" style="--c:${color};width:${size}px;height:${size}px"></span>`,
  });

function Focus({ quake }: { quake: QuakeDetail | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (quake?.latitude != null && quake.longitude != null) map.flyTo([quake.latitude, quake.longitude], Math.max(map.getZoom(), 7), { duration: 0.9 });
  }, [quake, map]);
  return null;
}

export default function EarthquakeMap({ quakes, selectedId, onSelect, still }: { quakes: QuakeDetail[]; selectedId: string | null; onSelect: (id: string) => void; still: boolean }) {
  const points = useMemo(() => quakes.filter((q) => q.latitude != null && q.longitude != null), [quakes]);
  const latest = points[0];
  const selected = points.find((q) => q.id === selectedId);
  const radius = (m: number) => 3 + Math.pow(Math.max(m, 1), 1.55) * 0.9;
  return (
    <div className="lc-map lc-map--dark eq-map relative h-full w-full">
      <MapContainer
        bounds={BOUNDS}
        zoomSnap={0.25}
        minZoom={4.5}
        maxZoom={11}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={0.7}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ background: "#0a1024" }}
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} />
        <AttributionControl position="bottomright" prefix={`<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a> | Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community`} />
        <Focus quake={selected} />
        {/* Weaker ones first, so the strong ones sit on top. */}
        {[...points].sort((a, b) => a.magnitude - b.magnitude).map((q) => {
          const color = shindoColor(q.maxIntensity);
          const isSel = q.id === selectedId;
          return (
            <CircleMarker
              key={q.id}
              center={[q.latitude as number, q.longitude as number]}
              radius={radius(q.magnitude)}
              pathOptions={{ color: isSel ? "#ffffff" : color, weight: isSel ? 2.4 : 1, fillColor: color, fillOpacity: isSel ? 0.85 : 0.5 }}
              eventHandlers={{ click: () => onSelect(q.id) }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <span className="font-jp">{q.location}</span> · M{q.magnitude.toFixed(1)}
              </Tooltip>
            </CircleMarker>
          );
        })}
        {latest && <Marker interactive={false} keyboard={false} position={[latest.latitude as number, latest.longitude as number]} icon={ringIcon(shindoColor(latest.maxIntensity), 46, still)} />}
        {selected && selected.id !== latest?.id && <Marker interactive={false} keyboard={false} position={[selected.latitude as number, selected.longitude as number]} icon={ringIcon("#ffffff", 40, still)} />}
      </MapContainer>
    </div>
  );
}
