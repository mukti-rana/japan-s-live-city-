import L from "leaflet";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import WeatherIcon from "@/components/ui/WeatherIcon";
import type { WeatherIconKind } from "@/lib/services/weather";

// Leaflet markers are plain HTML, so these build that HTML from fixed
// strings and numbers only — place names come from the site's own city list
// and are escaped anyway.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const iconSvg = new Map<WeatherIconKind, string>();
function weatherSvg(kind: WeatherIconKind): string {
  let svg = iconSvg.get(kind);
  if (!svg) {
    svg = renderToStaticMarkup(createElement(WeatherIcon, { icon: kind, size: 14, strokeWidth: 2.2 }));
    iconSvg.set(kind, svg);
  }
  return svg;
}

export const SEVERITY_COLOR = { emergency: "#ef4444", warning: "#f97316", advisory: "#facc15", info: "#60a5fa" } as const;

export function cityIcon(opts: { name: string; selected: boolean; label: boolean; alertColor?: string | null }) {
  const cls = ["lc-city", "lc-city--live", opts.selected ? "lc-city--sel" : "", opts.label ? "" : "lc-city--nolabel"].join(" ");
  const alert = opts.alertColor ? `<span class="lc-city__alert" style="background:${opts.alertColor}"></span>` : "";
  return L.divIcon({
    className: "",
    html: `<div class="${cls}"><span class="lc-city__ring"></span><span class="lc-city__dot"></span><span class="lc-city__label">${esc(opts.name)}</span>${alert}</div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export function weatherIcon(opts: { name: string; tempC: number; color: string; icon: WeatherIconKind; selected: boolean; compact: boolean; alertColor?: string | null }) {
  const cls = ["lc-wx", opts.selected ? "lc-wx--sel" : "", opts.compact ? "lc-wx--dot" : ""].join(" ");
  const alert = opts.alertColor ? `<span class="lc-city__alert" style="background:${opts.alertColor}"></span>` : "";
  return L.divIcon({
    className: "",
    html: `<div class="${cls}" style="--c:${opts.color}"><span class="lc-wx__pill">${weatherSvg(opts.icon)}<span>${opts.tempC}°</span></span><span class="lc-wx__name">${esc(opts.name)}</span>${alert}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function eventIcon(count: number, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="lc-ev ${selected ? "lc-ev--sel" : ""}">${count > 1 ? count : "★"}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function meIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="lc-me"><span class="lc-me__ring"></span><span class="lc-me__dot"></span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}
