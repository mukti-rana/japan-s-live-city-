"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, LocateFixed, MapPin, Navigation } from "lucide-react";
import PlacePicker from "@/components/news/PlacePicker";
import { OFFICIAL_LINKS } from "@/lib/emergency/content";
import { E } from "@/lib/emergency/strings";
import type { Facility, FacilityType, Hazard, Shelter } from "@/lib/emergency/nearby";
import { haversineKm, PREFECTURE_CENTER } from "@/lib/events/geo";
import { useInline } from "@/lib/i18n/inline";
import { resolvePlace } from "@/lib/news/places";
import { useNewsPlace } from "@/lib/news/useNews";

type Tab = "shelters" | "medical" | "pharmacy" | "police" | "fire" | "aed";
const TABS: { id: Tab; key: "tabShelters" | "tabMedical" | "tabPharmacy" | "tabPolice" | "tabFire" | "tabAed"; types: FacilityType[] }[] = [
  { id: "shelters", key: "tabShelters", types: [] },
  { id: "medical", key: "tabMedical", types: ["hospital", "clinic"] },
  { id: "pharmacy", key: "tabPharmacy", types: ["pharmacy"] },
  { id: "police", key: "tabPolice", types: ["police"] },
  { id: "fire", key: "tabFire", types: ["fire_station"] },
  { id: "aed", key: "tabAed", types: ["aed"] },
];

const HAZARD_KEY: Record<Hazard, "hazFlood" | "hazLandslide" | "hazStormSurge" | "hazEarthquake" | "hazTsunami" | "hazFire" | "hazInlandFlood" | "hazVolcano"> = {
  flood: "hazFlood",
  landslide: "hazLandslide",
  storm_surge: "hazStormSurge",
  earthquake: "hazEarthquake",
  tsunami: "hazTsunami",
  fire: "hazFire",
  inland_flood: "hazInlandFlood",
  volcano: "hazVolcano",
};

interface Origin {
  lat: number;
  lon: number;
  exact: boolean;
}

// The server only ever sees a position rounded to ~1 km.
const rounded = (n: number) => Math.round(n * 100) / 100;

interface Loaded<T> {
  key: string;
  data?: T;
  failed?: boolean;
}

function useJson<T>(url: string | null) {
  const [state, setState] = useState<Loaded<T> | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error("failed"))))
      .then((data) => setState({ key: url, data }))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setState({ key: url, failed: true });
      });
    return () => controller.abort();
  }, [url]);
  const current = state && state.key === url ? state : null;
  return { data: current?.data, failed: Boolean(current?.failed), loading: url !== null && !current };
}

const directionsUrl = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

export default function NearbyHelp() {
  const t = useInline(E);
  const placeInfo = useNewsPlace();
  const [tab, setTab] = useState<Tab>("shelters");
  const [exact, setExact] = useState<{ lat: number; lon: number } | null>(null);
  const [geo, setGeo] = useState<"idle" | "locating" | "denied">("idle");
  const [more, setMore] = useState(false);

  const resolved = resolvePlace(placeInfo.place);
  const center = resolved ? PREFECTURE_CENTER[resolved.prefectureId] : null;
  const origin: Origin | null = exact ? { ...exact, exact: true } : center ? { lat: center[0], lon: center[1], exact: false } : null;

  const point = origin ? `lat=${rounded(origin.lat)}&lon=${rounded(origin.lon)}` : null;
  const shelters = useJson<{ shelters: Shelter[]; unavailable?: boolean }>(origin && tab === "shelters" ? `/api/emergency/shelters?${point}` : null);
  const facilities = useJson<{ facilities: Facility[]; unavailable?: boolean }>(origin && tab !== "shelters" ? `/api/emergency/facilities?${point}` : null);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeo("denied");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setExact({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeo("idle");
      },
      () => setGeo("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  }

  const tabDef = TABS.find((x) => x.id === tab)!;
  const items = useMemo(() => {
    if (!origin) return [];
    if (tab === "shelters") {
      return (shelters.data?.shelters ?? [])
        .map((s) => ({ kind: "shelter" as const, shelter: s, km: haversineKm(origin.lat, origin.lon, s.lat, s.lon) }))
        .sort((a, b) => a.km - b.km);
    }
    return (facilities.data?.facilities ?? [])
      .filter((f) => tabDef.types.includes(f.type))
      .map((f) => ({ kind: "facility" as const, facility: f, km: haversineKm(origin.lat, origin.lon, f.lat, f.lon) }))
      .sort((a, b) => a.km - b.km);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lon, tab, shelters.data, facilities.data]);

  const source = tab === "shelters" ? shelters : facilities;
  const unavailable = source.failed || Boolean(tab === "shelters" ? shelters.data?.unavailable : facilities.data?.unavailable);
  const shown = items.slice(0, more ? 40 : 10);

  const directories =
    tab === "shelters"
      ? [{ label: "Hazard map portal (GSI)", url: OFFICIAL_LINKS.hazardMap }]
      : tab === "medical" || tab === "pharmacy"
        ? [
            { label: "JNTO — medical institution search", url: OFFICIAL_LINKS.jntoMedical },
            { label: "Ministry of Health — hospital & pharmacy search (Japanese)", url: OFFICIAL_LINKS.mhlwSearch },
          ]
        : [{ label: "JNTO — Safety Tips", url: OFFICIAL_LINKS.jntoSafety }];

  return (
    <section id="nearby" aria-labelledby="nearby-title" className="scroll-mt-24 rounded-2xl border border-white/15 bg-panel p-4 sm:p-5">
      <h2 id="nearby-title" className="text-lg font-bold text-foreground">
        {t("nearbyTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("nearbyIntro")}</p>

      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-white/15 bg-black/20 p-3.5">
        <PlacePicker current={placeInfo} compact />
        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geo === "locating"}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-azure/50 bg-azure/15 px-4 text-sm font-semibold text-azure hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60"
          >
            <LocateFixed size={16} aria-hidden="true" />
            {geo === "locating" ? t("locating") : t("useExact")}
          </button>
          {geo === "denied" && <p role="status" className="text-sm text-amber-300">{t("locationDenied")}</p>}
        </div>
        <p className="text-[11px] leading-relaxed text-muted">{t("exactNote")}</p>
      </div>

      <div role="tablist" aria-label={t("nearbyTitle")} className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => {
              setTab(x.id);
              setMore(false);
            }}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${tab === x.id ? "bg-azure text-black" : "border border-white/20 text-foreground/85 hover:bg-white/10"}`}
          >
            {t(x.key)}
          </button>
        ))}
      </div>

      <div className="mt-3" role="tabpanel">
        {!origin ? (
          <p className="rounded-xl border border-dashed border-white/20 p-5 text-center text-sm text-muted">{t("nearbyIntro")}</p>
        ) : source.loading ? (
          <p role="status" className="p-4 text-sm text-muted">{t("locating")}</p>
        ) : unavailable ? (
          <p role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">{t("unavailable")}</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/20 p-5 text-sm text-muted">{t("noResults")}</p>
        ) : (
          <>
            <p className="mb-2 text-[11px] text-muted">
              {t("fromWhere")}: {origin.exact ? t("yourPosition") : t("cityCentre")}
            </p>
            <ul className="flex flex-col gap-2">
              {shown.map((it, i) => {
                const lat = it.kind === "shelter" ? it.shelter.lat : it.facility.lat;
                const lon = it.kind === "shelter" ? it.shelter.lon : it.facility.lon;
                return (
                  <li key={i} className="flex flex-col gap-1.5 rounded-xl border border-white/15 bg-black/20 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-jp text-base font-semibold text-foreground">
                        {it.kind === "shelter" ? it.shelter.name : (it.facility.name ?? it.facility.nameEn ?? "—")}
                        {it.kind === "facility" && it.facility.nameEn && it.facility.name && <span className="block text-xs font-normal text-muted">{it.facility.nameEn}</span>}
                      </p>
                      <p className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-sm font-bold tabular-nums text-foreground">{it.km < 1 ? `${Math.round(it.km * 1000)} m` : `${it.km.toFixed(1)} km`}</p>
                    </div>
                    {(it.kind === "shelter" ? it.shelter.address : it.facility.address) && (
                      <p className="flex items-start gap-1.5 text-sm text-foreground/80">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-sakura" aria-hidden="true" />
                        {it.kind === "shelter" ? it.shelter.address : it.facility.address}
                      </p>
                    )}
                    {it.kind === "shelter" && it.shelter.hazards.length > 0 && (
                      <p className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted">{t("designatedFor")}:</span>
                        {it.shelter.hazards.map((h) => (
                          <span key={h} className="rounded-full bg-sky-400/15 px-2 py-0.5 font-medium text-sky-200">
                            {t(HAZARD_KEY[h])}
                          </span>
                        ))}
                      </p>
                    )}
                    {it.kind === "shelter" && it.shelter.remarks && <p className="text-xs text-muted">{it.shelter.remarks}</p>}
                    {it.kind === "facility" && it.facility.openingHours && (
                      <p className="text-xs text-foreground/75">
                        {t("hours")}: <span className="font-mono">{it.facility.openingHours}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-0.5">
                      <a href={directionsUrl(lat, lon)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-azure/15 px-3 text-sm font-semibold text-azure hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                        <Navigation size={14} aria-hidden="true" />
                        {t("directions")}
                      </a>
                      {it.kind === "facility" && it.facility.website && (
                        <a href={it.facility.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-azure hover:underline">
                          Website <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {items.length > shown.length && (
              <button type="button" onClick={() => setMore(true)} className="mt-3 min-h-11 rounded-xl border border-white/20 px-5 text-sm font-semibold text-foreground hover:bg-white/10">
                +{items.length - shown.length}
              </button>
            )}
          </>
        )}
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          {tab === "shelters" ? t("shelterNote") : t("osmNote")}{" "}
          <span className="text-muted">
            {t("source")}: {tab === "shelters" ? "Geospatial Information Authority of Japan (designated emergency evacuation sites)" : "OpenStreetMap contributors (ODbL)"}
          </span>
        </p>

        <div className="mt-3 rounded-xl border border-white/15 p-3.5">
          <h3 className="text-sm font-semibold text-foreground">{t("directories")}</h3>
          <ul className="mt-1.5 flex flex-col gap-1">
            {directories.map((d) => (
              <li key={d.url}>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-azure hover:underline">
                  {d.label}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
