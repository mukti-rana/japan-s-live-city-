"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { AttributionControl, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Search } from "lucide-react";
import { meIcon, placeIcon } from "@/components/map/markerIcons";
import type { Destination } from "@/lib/explore/types";
import { useTranslate } from "@/lib/i18n/inline";

// The Explore map. It shows exactly the places in the list beside it, numbered
// the same way; selecting a marker selects the list entry and the reverse.
// Moving the map offers "Search this area", which re-runs the list for the
// visible window.
const MAX_BOUNDS: L.LatLngBoundsExpression = [[20, 120], [47, 150]];

function Sync({ items, origin, selectedId, fitKey, onMoved }: { items: Destination[]; origin: { lat: number; lon: number } | null; selectedId: string | null; fitKey: string; onMoved: (bounds: [number, number, number, number]) => void }) {
  const map = useMap();
  const programmatic = useRef(true);
  const lastFit = useRef("");

  // Fit the view when the set of places changes (not on every re-render).
  useEffect(() => {
    if (lastFit.current === fitKey) return;
    lastFit.current = fitKey;
    const points: [number, number][] = items.map((p) => [p.lat, p.lon]);
    if (origin) points.push([origin.lat, origin.lon]);
    programmatic.current = true;
    if (points.length === 0) map.setView(origin ? [origin.lat, origin.lon] : [37.5, 137.5], origin ? 10 : 5);
    else if (points.length === 1) map.setView(points[0], 12);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
  }, [map, items, origin, fitKey]);

  // A place chosen from the list comes into view.
  useEffect(() => {
    const p = items.find((i) => i.id === selectedId);
    if (!p) return;
    programmatic.current = true;
    if (!map.getBounds().contains([p.lat, p.lon])) map.panTo([p.lat, p.lon]);
  }, [map, items, selectedId]);

  useMapEvents({
    moveend() {
      if (programmatic.current) {
        programmatic.current = false;
        return;
      }
      const b = map.getBounds();
      onMoved([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
    },
  });
  return null;
}

function Clicks({ onBackground }: { onBackground: () => void }) {
  useMapEvents({ click: onBackground });
  return null;
}

export default function ExploreMap({
  items,
  origin,
  gps,
  selectedId,
  onSelect,
  onSearchArea,
  fitKey,
}: {
  items: Destination[];
  origin: { lat: number; lon: number } | null;
  gps: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onSearchArea: (bbox: [number, number, number, number]) => void;
  fitKey: string;
}) {
  const tr = useTranslate();
  const [moved, setMoved] = useState<[number, number, number, number] | null>(null);
  const icons = useMemo(() => new Map(items.map((p, i) => [p.id, { normal: placeIcon(false, i + 1), selected: placeIcon(true, i + 1) }])), [items]);
  // Clear the offer whenever the list changes.
  const [seenKey, setSeenKey] = useState(fitKey);
  if (seenKey !== fitKey) {
    setSeenKey(fitKey);
    setMoved(null);
  }

  return (
    <div className="lc-map lc-map--dark relative h-full min-h-[22rem] w-full overflow-hidden rounded-2xl border border-glass-border">
      <MapContainer center={[37.5, 137.5]} zoom={5} minZoom={4.5} maxZoom={16} maxBounds={MAX_BOUNDS} zoomSnap={0.25} attributionControl={false} className="h-full w-full" style={{ background: "#0a1024" }}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} maxZoom={16} />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} maxZoom={16} />
        <AttributionControl position="bottomright" prefix={`<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a> | Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community`} />
        <Sync items={items} origin={origin} selectedId={selectedId} fitKey={fitKey} onMoved={setMoved} />
        <Clicks onBackground={() => onSelect(null)} />
        {origin && gps && <Marker position={[origin.lat, origin.lon]} icon={meIcon()} interactive={false} />}
        {items.map((p) => {
          const ic = icons.get(p.id);
          return ic ? (
            <Marker
              key={p.id}
              position={[p.lat, p.lon]}
              icon={p.id === selectedId ? ic.selected : ic.normal}
              zIndexOffset={p.id === selectedId ? 1000 : 0}
              eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onSelect(p.id); } }}
            />
          ) : null;
        })}
      </MapContainer>
      {moved && (
        <div className="absolute left-1/2 top-3 z-[500] -translate-x-1/2">
          <button
            type="button"
            onClick={() => onSearchArea(moved)}
            className="flex min-h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 text-xs font-semibold text-white shadow-lg"
          >
            <Search size={13} aria-hidden="true" />
            {tr("Search this area")}
          </button>
        </div>
      )}
    </div>
  );
}
