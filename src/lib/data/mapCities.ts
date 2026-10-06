// Layout positions for the stylised dotted map on the Home page. Only the
// drawing coordinates live here — each city's real lat/lon comes from
// HERO_CITIES (matched by slug), and its temperature is fetched live, so
// nothing on the map is a hardcoded weather value.
export interface MapCityLayout {
  slug: string;
  name: string;
  x: number;
  y: number;
  active: boolean;
  labelDx: number;
  labelDy: number;
  labelAnchor: "start" | "end";
}

export const MAP_CITIES: MapCityLayout[] = [
  { slug: "sapporo", name: "Sapporo", x: 262, y: 52, active: false, labelDx: -8, labelDy: -14, labelAnchor: "end" },
  { slug: "sendai", name: "Sendai", x: 222, y: 104, active: false, labelDx: 8, labelDy: -12, labelAnchor: "start" },
  { slug: "tokyo", name: "Tokyo", x: 192, y: 150, active: true, labelDx: 14, labelDy: -14, labelAnchor: "start" },
  { slug: "kyoto", name: "Kyoto", x: 128, y: 166, active: false, labelDx: -10, labelDy: -26, labelAnchor: "end" },
  { slug: "osaka", name: "Osaka", x: 122, y: 182, active: false, labelDx: 4, labelDy: 8, labelAnchor: "start" },
  { slug: "fukuoka", name: "Fukuoka", x: 46, y: 208, active: false, labelDx: -4, labelDy: 6, labelAnchor: "start" },
];
