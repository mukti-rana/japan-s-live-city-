"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { AttributionControl, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { TrainFront } from "lucide-react";
import Link from "next/link";
import MapControls, { type BaseKey, type LayerKey } from "@/components/map/MapControls";
import MapPanel, { type AlertsPayload, type EventGroup, type Selection } from "@/components/map/MapPanel";
import MapSearch, { type SearchEntry } from "@/components/map/MapSearch";
import { cityIcon, eventIcon, meIcon, SEVERITY_COLOR, weatherIcon } from "@/components/map/markerIcons";
import { useLazyJson } from "@/components/map/useMapData";
import { useInline, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MAP_CITIES, MAP_CITY_BY_SLUG, TEMP_BANDS, tempColor } from "@/lib/map/cities";
import type { EventView, EventsResult } from "@/lib/events/query";
import type { MapWeatherPoint } from "@/lib/services/weather";

// Leaflet + Esri's public tile servers (the provider this map already used).
// The dark map adds Esri's matching "reference" layer, which carries place
// names, so cities and regions are labelled without any new provider.
const BASE: Record<BaseKey, { layers: { url: string; maxNativeZoom: number }[]; attribution: string }> = {
  dark: {
    layers: [
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 16 },
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 16 },
    ],
    attribution: "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community",
  },
  satellite: {
    layers: [
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 17 },
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 17 },
    ],
    attribution: "Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
};

// Japan fills the first view. A wide, short map frames the main islands; a
// tall (phone) map also has room for Okinawa.
const MAIN_BOUNDS = L.latLngBounds([32.0, 129.0], [45.7, 145.9]);
const FULL_BOUNDS = L.latLngBounds([25.4, 126.6], [45.9, 146.4]);
const MAX_BOUNDS = L.latLngBounds([14, 108], [56, 168]);
const EVENT_KINDS = "festival,fireworks,music,culture,art,food,sports";

function fitJapan(map: L.Map, animate: boolean) {
  const size = map.getSize();
  const bounds = size.x / Math.max(size.y, 1) > 1.15 ? MAIN_BOUNDS : FULL_BOUNDS;
  map.fitBounds(bounds, { animate, padding: [12, 12] });
}

const TEXT = {
  trainsNote: { en: "Live train status isn't connected yet", ja: "電車の運行情報は未接続です" },
  trainsBody: { en: "No delays or suspensions are shown on the map because no verified live source is integrated. Nothing is simulated.", ja: "検証済みのリアルタイム情報源がないため、遅延や運休は表示していません。仮の情報は出していません。" },
  trainsOpen: { en: "Open Trains", ja: "電車ページへ" },
  legendWeather: { en: "Temperature", ja: "気温" },
  legendAlerts: { en: "Alert level", ja: "警報レベル" },
  lvEmergency: { en: "Emergency", ja: "特別警報" },
  lvWarning: { en: "Warning", ja: "警報" },
  lvAdvisory: { en: "Advisory", ja: "注意報" },
  alertsNote: { en: "Official JMA data. A coloured dot marks the highest level in a city's prefecture.", ja: "気象庁の公式情報。都市のある都道府県の最高レベルを色の点で表示。" },
  alertsStale: { en: "JMA's latest warning report for some areas is over 36 hours old, so it isn't shown as current.", ja: "一部地域の気象庁の最新の警報発表が36時間以上前のため、現在の情報としては表示していません。" },
  jma: { en: "Check JMA for the live picture", ja: "気象庁で最新情報を確認" },
  alertsDown: { en: "Alert data is unavailable right now.", ja: "警報情報を取得できません。" },
  national: { en: "Official reports", ja: "公式の発表" },
  eventsLegend: { en: "Events with a known location", ja: "場所が分かるイベント" },
  eventsNone: { en: "No current events with a known location.", ja: "場所が分かる開催中・予定のイベントはありません。" },
  eventsDown: { en: "Events are unavailable right now.", ja: "イベントを取得できません。" },
  showEnded: { en: "Include events that ended in the last 2 weeks", ja: "過去2週間に終了したイベントも表示" },
  wxDown: { en: "Weather is unavailable right now, so cities show without temperatures.", ja: "天気を取得できないため、気温なしで表示しています。" },
  locDenied: { en: "Location permission was declined. You can still search or pick a city.", ja: "位置情報の許可が拒否されました。検索や都市の選択は引き続き使えます。" },
  locUnavailable: { en: "Your location couldn't be determined.", ja: "現在地を取得できませんでした。" },
  locOutside: { en: "You appear to be outside Japan, so the map stays on Japan.", ja: "日本国外にいるようです。地図は日本のままです。" },
  locFound: { en: "Centred on your location. It stays in your browser.", ja: "現在地に移動しました。位置情報はブラウザ内にのみ保持されます。" },
  retry: { en: "Try again", ja: "再試行" },
  loading: { en: "Loading…", ja: "読み込み中…" },
} satisfies Table;

interface Rect { x: number; y: number; w: number; h: number }
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function MapEvents({ onMove, onBackgroundClick }: { onMove: () => void; onBackgroundClick: () => void }) {
  useMapEvents({ zoomend: onMove, moveend: onMove, click: onBackgroundClick });
  return null;
}

function severityOf(alerts: { severity: string }[] | undefined): keyof typeof SEVERITY_COLOR | null {
  if (!alerts || alerts.length === 0) return null;
  for (const level of ["emergency", "warning", "advisory"] as const) if (alerts.some((a) => a.severity === level)) return level;
  return null;
}

export default function FullMap() {
  const { language } = useLanguage();
  const text = useInline(TEXT);
  const [map, setMap] = useState<L.Map | null>(null);
  const [base, setBase] = useState<BaseKey>("dark");
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ weather: false, trains: false, events: false, alerts: false });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showEnded, setShowEnded] = useState(false);
  const [moveTick, setMoveTick] = useState(0);
  const [me, setMe] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Weather for every city is one cached request, made once; the layer toggle
  // only changes how it is drawn.
  const weather = useLazyJson<{ cities: Record<string, MapWeatherPoint> }>("/api/map/weather");
  const alerts = useLazyJson<AlertsPayload>(layers.alerts ? "/api/map/alerts" : null);
  const evA = useLazyJson<EventsResult>(layers.events ? `/api/events?kind=${EVENT_KINDS}&limit=30` : null);
  const evB = useLazyJson<EventsResult>(layers.events ? `/api/events?kind=${EVENT_KINDS}&limit=30&offset=30` : null);
  const evEnded = useLazyJson<EventsResult>(layers.events && showEnded ? `/api/events?kind=${EVENT_KINDS}&status=ended&limit=30` : null);

  // ── Events grouped by position ─────────────────────────────────────────
  const today = evA.data?.today ?? "";
  const groups = useMemo<EventGroup[]>(() => {
    if (!layers.events) return [];
    const all: EventView[] = [...(evA.data?.items ?? []), ...(evB.data?.items ?? []), ...(showEnded ? evEnded.data?.items ?? [] : [])];
    const byKey = new Map<string, EventGroup>();
    const seen = new Set<string>();
    for (const e of all) {
      if (e.lat === null || e.lon === null || seen.has(e.id)) continue;
      seen.add(e.id);
      const key = `${e.lat.toFixed(3)},${e.lon.toFixed(3)}`;
      const g = byKey.get(key) ?? { key, lat: e.lat, lon: e.lon, events: [] };
      g.events.push(e);
      byKey.set(key, g);
    }
    return [...byKey.values()];
  }, [layers.events, evA.data, evB.data, evEnded.data, showEnded]);

  // ── Labels that never pile on top of each other ───────────────────────
  const cityState = useMemo(() => {
    void moveTick;
    const state = new Map<string, "full" | "dot">();
    if (!map) return state;
    const placed: Rect[] = [];
    const sorted = [...MAP_CITIES].sort((a, b) => (selection?.type === "city" && selection.slug === a.slug ? -1 : selection?.type === "city" && selection.slug === b.slug ? 1 : a.rank - b.rank));
    for (const c of sorted) {
      const p = map.latLngToContainerPoint([c.lat, c.lon]);
      const rect: Rect = layers.weather
        ? { x: p.x - 36, y: p.y - 20, w: 72, h: 42 }
        : { x: p.x - 6, y: p.y - 10, w: 14 + c.name.length * 7 + 8, h: 20 };
      if (placed.some((r) => overlaps(r, rect))) {
        state.set(c.slug, "dot");
      } else {
        placed.push(rect);
        state.set(c.slug, "full");
      }
    }
    return state;
  }, [map, moveTick, layers.weather, selection]);

  const alertLevel = useCallback(
    (prefectureId: string) => {
      if (!layers.alerts || !alerts.data || alerts.data.unavailable.includes(prefectureId)) return null;
      const level = severityOf(alerts.data.byPrefecture[prefectureId]);
      return level ? SEVERITY_COLOR[level] : null;
    },
    [layers.alerts, alerts.data],
  );

  // ── Map actions ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;
    map.invalidateSize();
    fitJapan(map, false);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) setSelection(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function flyTo(lat: number, lon: number, zoom: number) {
    if (!map) return;
    // On wide screens the info card sits on the left, so shift the target right of it.
    // On a phone the sheet covers the lower part, so lift the target up instead.
    const size = map.getSize();
    const wide = size.x > 700;
    const target = map.project([lat, lon], zoom).add(wide ? [-190, 0] : [0, size.y * 0.2]);
    map.flyTo(map.unproject(target, zoom), zoom, { duration: 0.9 });
  }

  function selectCity(slug: string, zoom = 8) {
    const c = MAP_CITY_BY_SLUG.get(slug);
    if (!c) return;
    setSelection({ type: "city", slug });
    flyTo(c.lat, c.lon, Math.max(map?.getZoom() ?? 0, zoom));
  }

  function pickSearch(e: SearchEntry) {
    if (e.mapCitySlug) {
      selectCity(e.mapCitySlug, 10);
      return;
    }
    setSelection({ type: "place", id: e.id, name: e.name, nameJa: e.nameJa, sub: e.kind === "prefecture" ? (language === "ja" ? "都道府県" : "Prefecture") : e.sub, lat: e.lat, lon: e.lon, prefectureId: e.prefectureId });
    flyTo(e.lat, e.lon, e.zoom);
  }

  function locate() {
    setNotice(null);
    if (!navigator.geolocation) {
      setNotice(text("locUnavailable"));
      return;
    }
    setLocating(true);
    // Asked only now, on the visitor's click. The position is used to move the
    // map and is never sent anywhere.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lon } = pos.coords;
        if (!MAX_BOUNDS.contains([lat, lon]) || lat < 24 || lat > 46 || lon < 122 || lon > 149) {
          setNotice(text("locOutside"));
          return;
        }
        setMe({ lat, lon });
        setNotice(text("locFound"));
        flyTo(lat, lon, 11);
      },
      (err) => {
        setLocating(false);
        setNotice(err.code === err.PERMISSION_DENIED ? text("locDenied") : text("locUnavailable"));
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  function toggleLayer(k: LayerKey) {
    setLayers((l) => ({ ...l, [k]: !l[k] }));
  }

  const onMove = useCallback(() => setMoveTick((n) => n + 1), []);

  // Selected pieces for the panel.
  const selectedCity = selection?.type === "city" ? MAP_CITY_BY_SLUG.get(selection.slug) ?? null : null;
  const selectedGroup = selection?.type === "events" ? groups.find((g) => g.key === selection.key) ?? null : null;
  const hasPanel = Boolean(selection && (selection.type !== "events" || selectedGroup));
  const wxPoints = weather.data?.cities ?? {};

  return (
    <div className={`lc-map ${base === "dark" ? "lc-map--dark" : ""} relative h-full w-full`}>
      <MapContainer
        ref={setMap}
        center={[37.5, 137.5]}
        zoom={5}
        zoomSnap={0.25}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={90}
        minZoom={4.5}
        maxZoom={16}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={0.7}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
        style={{ background: "#0a1024" }}
      >
        {BASE[base].layers.map((l, i) => (
          <TileLayer key={`${base}-${i}`} url={l.url} maxNativeZoom={l.maxNativeZoom} maxZoom={16} />
        ))}
        {/* Credit for the tiles in use, rebuilt whenever the map style changes. */}
        <AttributionControl key={base} position="bottomright" prefix={`<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a> | ${BASE[base].attribution}`} />
        <MapEvents onMove={onMove} onBackgroundClick={() => setSelection(null)} />

        {MAP_CITIES.map((c) => {
          const selected = selection?.type === "city" && selection.slug === c.slug;
          const state = cityState.get(c.slug) ?? "full";
          const point = wxPoints[c.slug];
          const alertColor = alertLevel(c.prefectureId);
          const icon =
            layers.weather && point
              ? weatherIcon({ name: language === "ja" ? c.nameJa : c.name, tempC: point.tempC, color: tempColor(point.tempC), icon: point.icon, selected, compact: state === "dot" && !selected, alertColor })
              : cityIcon({ name: language === "ja" ? c.nameJa : c.name, selected, label: state === "full" || selected, alertColor });
          return (
            <Marker
              key={c.slug}
              position={[c.lat, c.lon]}
              icon={icon}
              title={language === "ja" ? c.nameJa : c.name}
              alt={c.name}
              zIndexOffset={selected ? 1000 : 100 - c.rank}
              eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); selectCity(c.slug); } }}
            />
          );
        })}

        {groups.map((g) => (
          <Marker
            key={g.key}
            position={[g.lat, g.lon]}
            icon={eventIcon(g.events.length, selection?.type === "events" && selection.key === g.key)}
            title={g.events[0].title}
            zIndexOffset={500}
            eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); setSelection({ type: "events", key: g.key }); } }}
          />
        ))}

        {me && <Marker position={[me.lat, me.lon]} icon={meIcon()} interactive={false} keyboard={false} zIndexOffset={900} />}
      </MapContainer>

      {/* Search */}
      <div className="absolute left-3 top-3 z-[1000] w-[min(22.5rem,calc(100%-5.5rem))]">
        <MapSearch onPick={pickSearch} />
      </div>

      <MapControls
        base={base}
        onBase={setBase}
        layers={layers}
        onLayer={toggleLayer}
        locating={locating}
        onLocate={locate}
        onZoomIn={() => map?.zoomIn(1)}
        onZoomOut={() => map?.zoomOut(1)}
        onReset={() => {
          setSelection(null);
          if (map) fitJapan(map, true);
        }}
      />

      {hasPanel && selection && (
        <MapPanel
          selection={selection}
          city={selectedCity}
          group={selectedGroup}
          weather={selectedCity ? wxPoints[selectedCity.slug] ?? null : null}
          weatherLoading={weather.loading}
          alerts={alerts.data}
          alertsOn={layers.alerts}
          alertsLoading={alerts.loading}
          today={today || new Date().toISOString().slice(0, 10)}
          onClose={() => setSelection(null)}
        />
      )}

      {/* Legends and notes: small cards beside the controls, never over the middle. */}
      <div className={`pointer-events-none absolute bottom-3 right-16 z-[900] flex w-[min(17rem,calc(100%-6rem))] flex-col items-end gap-2 ${hasPanel ? "max-sm:hidden" : ""}`}>
        {notice && (
          <p role="status" className="pointer-events-auto rounded-xl border border-glass-border bg-panel/95 px-3 py-2 text-xs text-foreground/90 shadow-lg backdrop-blur-xl">
            {notice}
          </p>
        )}
        {layers.weather && (
          <div className="pointer-events-auto w-full rounded-xl border border-glass-border bg-panel/95 px-3 py-2 shadow-lg backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{text("legendWeather")}</p>
            <div className="mt-1.5 flex gap-1">
              {TEMP_BANDS.map((b) => (
                <span key={b.label} className="flex flex-1 flex-col items-center gap-1 text-[10px] text-foreground/80">
                  <span className="h-1.5 w-full rounded-full" style={{ background: b.color }} />
                  {b.label}
                </span>
              ))}
            </div>
            {weather.failed && <p className="mt-1.5 text-[11px] text-gold">{text("wxDown")}</p>}
          </div>
        )}
        {layers.alerts && (
          <div className="pointer-events-auto w-full rounded-xl border border-glass-border bg-panel/95 px-3 py-2 shadow-lg backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{text("legendAlerts")}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-foreground/85">
              {([["emergency", "lvEmergency"], ["warning", "lvWarning"], ["advisory", "lvAdvisory"]] as const).map(([k, label]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_COLOR[k] }} />
                  {text(label)}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted">
              {alerts.loading ? text("loading") : alerts.failed ? text("alertsDown") : text("alertsNote")}
            </p>
            {alerts.data && alerts.data.notes.length > 0 && (
              <p className="mt-1.5 text-[11px] leading-snug text-gold">
                {text("alertsStale")}{" "}
                <a href="https://www.jma.go.jp/bosai/map.html#contents=warning" target="_blank" rel="noopener noreferrer" className="underline">
                  {text("jma")}
                </a>
              </p>
            )}
            {alerts.data && alerts.data.national.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 border-t border-glass-border pt-2">
                <li className="text-[11px] font-semibold uppercase tracking-wide text-muted">{text("national")}</li>
                {alerts.data.national.slice(0, 3).map((a) => (
                  <li key={a.id} className="text-[11px] leading-snug text-foreground/85">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: SEVERITY_COLOR[a.severity] }} />
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {language === "ja" ? a.titleJa : a.title} — {a.area}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {alerts.failed && (
              <button type="button" onClick={alerts.retry} className="mt-1 text-[11px] font-medium text-azure hover:underline">
                {text("retry")}
              </button>
            )}
          </div>
        )}
        {layers.events && (
          <div className="pointer-events-auto w-full rounded-xl border border-glass-border bg-panel/95 px-3 py-2 shadow-lg backdrop-blur-xl">
            <p className="flex items-center gap-1.5 text-[11px] text-foreground/85">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neon-purple text-[9px] font-bold text-white">★</span>
              {text("eventsLegend")}
            </p>
            <label className="mt-1.5 flex items-start gap-2 text-[11px] leading-snug text-muted">
              <input type="checkbox" checked={showEnded} onChange={(e) => setShowEnded(e.target.checked)} className="mt-0.5 accent-[#8b5cf6]" />
              {text("showEnded")}
            </label>
            {(evA.failed || evB.failed) && <p className="mt-1.5 text-[11px] text-gold">{text("eventsDown")}</p>}
            {!evA.loading && !evA.failed && groups.length === 0 && <p className="mt-1.5 text-[11px] text-muted">{text("eventsNone")}</p>}
            {(evA.loading || evB.loading) && <p className="mt-1.5 text-[11px] text-muted">{text("loading")}</p>}
          </div>
        )}
        {layers.trains && (
          <div className="pointer-events-auto w-full rounded-xl border border-glass-border bg-panel/95 px-3 py-2 shadow-lg backdrop-blur-xl">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <TrainFront size={13} className="text-azure" aria-hidden="true" />
              {text("trainsNote")}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted">{text("trainsBody")}</p>
            <Link href="/trains" className="mt-1 inline-block text-[11px] font-medium text-azure hover:underline">
              {text("trainsOpen")} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
