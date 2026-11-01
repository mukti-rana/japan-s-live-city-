"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CalendarDays, CloudSun, Crosshair, LocateFixed, Minus, Moon, Plus, Satellite, TrainFront, type LucideIcon } from "lucide-react";
import { useInline, type Table } from "@/lib/i18n/inline";

export type LayerKey = "weather" | "trains" | "events" | "alerts";
export type BaseKey = "dark" | "satellite";

const TEXT = {
  dark: { en: "Dark map", ja: "ダークマップ" },
  satellite: { en: "Satellite", ja: "衛星写真" },
  weather: { en: "Weather", ja: "天気" },
  trains: { en: "Trains", ja: "電車" },
  events: { en: "Events", ja: "イベント" },
  alerts: { en: "Disaster alerts", ja: "災害警報" },
  locate: { en: "My location", ja: "現在地" },
  zoomIn: { en: "Zoom in", ja: "拡大" },
  zoomOut: { en: "Zoom out", ja: "縮小" },
  reset: { en: "Reset map view", ja: "表示をリセット" },
  basemap: { en: "Map style", ja: "地図スタイル" },
  layers: { en: "Map layers", ja: "レイヤー" },
  navigation: { en: "Map navigation", ja: "地図の操作" },
} satisfies Table;

function Tool({
  label,
  icon: Icon,
  active,
  busy,
  onClick,
  tone = "azure",
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  busy?: boolean;
  onClick: () => void;
  tone?: "azure" | "violet" | "amber" | "plain";
}) {
  const on =
    tone === "violet" ? "bg-neon-purple/25 text-[#c4b5fd] shadow-[inset_0_0_0_1px_rgba(167,139,250,0.55)]"
    : tone === "amber" ? "bg-orange-500/20 text-orange-300 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.55)]"
    : "bg-azure/25 text-azure shadow-[inset_0_0_0_1px_rgba(77,163,255,0.55)]";
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active === undefined ? undefined : active}
        disabled={busy}
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60 ${
          active ? on : "text-foreground/75 hover:bg-glass-bg-strong hover:text-foreground"
        }`}
      >
        <Icon size={18} aria-hidden="true" className={busy ? "motion-safe:animate-pulse" : ""} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-glass-border bg-panel px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:hidden"
      >
        {label}
      </span>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-0.5 rounded-2xl border border-glass-border bg-panel/90 p-1 shadow-lg backdrop-blur-xl">
      {children}
    </div>
  );
}

// Two compact columns on the right edge: styles and layers at the top, map
// navigation at the bottom. Nothing here covers the middle of the map.
export default function MapControls({
  base,
  onBase,
  layers,
  onLayer,
  locating,
  onLocate,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  base: BaseKey;
  onBase: (b: BaseKey) => void;
  layers: Record<LayerKey, boolean>;
  onLayer: (k: LayerKey) => void;
  locating: boolean;
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const text = useInline(TEXT);
  return (
    <>
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
        <Group label={text("basemap")}>
          <Tool label={text("dark")} icon={Moon} active={base === "dark"} onClick={() => onBase("dark")} />
          <Tool label={text("satellite")} icon={Satellite} active={base === "satellite"} onClick={() => onBase("satellite")} />
        </Group>
        <Group label={text("layers")}>
          <Tool label={text("weather")} icon={CloudSun} active={layers.weather} onClick={() => onLayer("weather")} />
          <Tool label={text("trains")} icon={TrainFront} active={layers.trains} onClick={() => onLayer("trains")} />
          <Tool label={text("events")} icon={CalendarDays} active={layers.events} tone="violet" onClick={() => onLayer("events")} />
          <Tool label={text("alerts")} icon={AlertTriangle} active={layers.alerts} tone="amber" onClick={() => onLayer("alerts")} />
        </Group>
      </div>

      <div className="absolute bottom-8 right-3 z-[1000] flex flex-col gap-2">
        <Group label={text("navigation")}>
          <Tool label={text("locate")} icon={LocateFixed} busy={locating} onClick={onLocate} />
          <Tool label={text("zoomIn")} icon={Plus} onClick={onZoomIn} />
          <Tool label={text("zoomOut")} icon={Minus} onClick={onZoomOut} />
          <Tool label={text("reset")} icon={Crosshair} onClick={onReset} />
        </Group>
      </div>
    </>
  );
}
