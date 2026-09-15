"use client";

import "leaflet/dist/leaflet.css";
import { useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Link from "next/link";
import { Moon, Satellite } from "lucide-react";
import type { CityInfo } from "@/lib/data/cities";
import type { WeatherSnapshot } from "@/lib/services/weather";

export type CityWithWeather = CityInfo & { weather: WeatherSnapshot | null };

type LayerId = "dark" | "satellite";

const LAYERS: Record<
  LayerId,
  { url: string; attribution: string }
> = {
  dark: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics",
  },
};

const LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

function cityIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:18px;height:18px;">
      <span class="animate-ping" style="position:absolute;inset:0;border-radius:9999px;background:#FF6B9D;opacity:0.55;"></span>
      <span style="position:absolute;inset:3px;border-radius:9999px;background:#FF6B9D;border:2px solid #0B0E1A;box-shadow:0 0 10px 2px rgba(255,107,157,0.6);"></span>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function JapanMap({ cities }: { cities: CityWithWeather[] }) {
  const [layer, setLayer] = useState<LayerId>("dark");

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[36.6, 138.2]}
        zoom={5}
        minZoom={4}
        maxZoom={11}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: "#0a1024" }}
      >
        <TileLayer key={layer} url={LAYERS[layer].url} attribution={LAYERS[layer].attribution} />
        {layer === "satellite" && <TileLayer url={LABELS_URL} attribution="" />}

        {cities.map((city) => (
          <Marker key={city.slug} position={[city.lat, city.lon]} icon={cityIcon()}>
            <Popup>
              <p className="text-sm font-semibold text-foreground">{city.name}</p>
              {city.weather ? (
                <p className="mt-0.5 text-xs text-muted">
                  {city.weather.tempC}°C · {city.weather.condition}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted">Weather unavailable</p>
              )}
              <Link
                href={`/${city.slug}`}
                className="mt-1.5 inline-block text-xs font-medium text-azure"
              >
                View city →
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex gap-1 rounded-xl border border-glass-border bg-panel/90 p-1 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setLayer("dark")}
          className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            layer === "dark"
              ? "bg-azure/20 text-azure"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Moon size={13} />
          Dark
        </button>
        <button
          type="button"
          onClick={() => setLayer("satellite")}
          className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            layer === "satellite"
              ? "bg-azure/20 text-azure"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Satellite size={13} />
          Satellite
        </button>
      </div>
    </div>
  );
}
