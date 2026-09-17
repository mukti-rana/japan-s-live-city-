// MOCK DATA — Phase 1 placeholder only.
// None of the values below are real or live. Each group will be replaced by a
// real service (WeatherService, TrainService, NewsService, EventsService,
// PlacesService, TrendingService) in a later phase. Do not ship this file
// as-is to production without swapping in real data sources.

export const mockCity = {
  name: "Kyoto",
  nameJa: "京都",
  timeZone: "Asia/Tokyo",
};

export const mockWeather = {
  tempC: 24,
  condition: "Clear",
  humidity: 68,
  windMs: 2,
  feelsLikeC: 24,
};

export const mockForecast = [
  { day: "Thu", high: 26, low: 18, icon: "sun" as const },
  { day: "Fri", high: 27, low: 18, icon: "partly" as const },
  { day: "Sat", high: 28, low: 19, icon: "cloud" as const },
];

export const mockMapCities = [
  { name: "Sapporo", tempC: 18, x: 262, y: 52, active: false, labelDx: -8, labelDy: -14, labelAnchor: "end" },
  { name: "Sendai", tempC: 21, x: 222, y: 104, active: false, labelDx: 8, labelDy: -12, labelAnchor: "start" },
  { name: "Tokyo", tempC: 26, x: 192, y: 150, active: true, labelDx: 14, labelDy: -14, labelAnchor: "start" },
  { name: "Kyoto", tempC: 24, x: 128, y: 166, active: false, labelDx: -10, labelDy: -26, labelAnchor: "end" },
  { name: "Osaka", tempC: 25, x: 122, y: 182, active: false, labelDx: 4, labelDy: 8, labelAnchor: "start" },
  { name: "Fukuoka", tempC: 27, x: 46, y: 208, active: false, labelDx: -4, labelDy: 6, labelAnchor: "start" },
];

export const mockTrainTabs = ["All Lines", "JR", "Private", "Subway"];

export const mockTrainLines = [
  { name: "Tokaido Line", note: "Tokyo ↔ Atami", color: "#F2994A", status: "Normal" },
  { name: "Yamanote Line", note: "Tokyo Loop", color: "#6FCF52", status: "Normal" },
  { name: "Keihin-Tohoku Line", note: "", color: "#4DA3FF", status: "Normal" },
  { name: "Hankyu Kyoto Line", note: "", color: "#F2704A", status: "Normal" },
  { name: "Keihan Main Line", note: "", color: "#6FCF52", status: "Normal" },
  { name: "Kintetsu Nara Line", note: "", color: "#F2544A", status: "Normal" },
];

export const mockTrainSummary = "No major delays at the moment";
