"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { AttributionControl, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { meIcon, placeIcon } from "@/components/map/markerIcons";

// Places with community content on the same dark map the rest of the site uses.
// Choosing a marker selects that place (the list beside it shows it). The visitor's
// own position, when they chose to share it, is drawn only in their browser.
const MAX_BOUNDS: L.LatLngBoundsExpression = [[20, 120], [47, 150]];

export interface MapPlace {
  ref: string;
  lat: number;
  lon: number;
}

function Fit({ items, me, fitKey }: { items: MapPlace[]; me: { lat: number; lon: number } | null; fitKey: string }) {
  const map = useMap();
  const last = useRef("");
  useEffect(() => {
    if (last.current === fitKey) return;
    last.current = fitKey;
    const points: [number, number][] = items.map((p) => [p.lat, p.lon]);
    if (me) points.push([me.lat, me.lon]);
    if (points.length === 0) map.setView([37.5, 137.5], 5);
    else if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
  }, [map, items, me, fitKey]);
  return null;
}

function Clicks({ onBackground }: { onBackground: () => void }) {
  useMapEvents({ click: onBackground });
  return null;
}

export default function PlacesMap({ items, me, selected, onSelect, fitKey }: { items: MapPlace[]; me: { lat: number; lon: number } | null; selected: string | null; onSelect: (ref: string | null) => void; fitKey: string }) {
  const icons = useMemo(() => new Map(items.map((p, i) => [p.ref, { normal: placeIcon(false, i + 1), selected: placeIcon(true, i + 1) }])), [items]);
  return (
    <div className="lc-map lc-map--dark relative h-[26rem] w-full overflow-hidden rounded-2xl border border-glass-border sm:h-[32rem]">
      <MapContainer center={[37.5, 137.5]} zoom={5} minZoom={4.5} maxZoom={17} maxBounds={MAX_BOUNDS} zoomSnap={0.25} attributionControl={false} className="h-full w-full" style={{ background: "#0a1024" }}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} maxZoom={17} />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} maxZoom={17} />
        <AttributionControl position="bottomright" prefix={`<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a> | Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community`} />
        <Fit items={items} me={me} fitKey={fitKey} />
        <Clicks onBackground={() => onSelect(null)} />
        {me && <Marker position={[me.lat, me.lon]} icon={meIcon()} interactive={false} />}
        {items.map((p) => {
          const ic = icons.get(p.ref);
          return ic ? (
            <Marker key={p.ref} position={[p.lat, p.lon]} icon={p.ref === selected ? ic.selected : ic.normal} zIndexOffset={p.ref === selected ? 1000 : 0} eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onSelect(p.ref); } }} />
          ) : null;
        })}
      </MapContainer>
    </div>
  );
}
