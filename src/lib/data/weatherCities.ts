// The cities the Weather tab can switch between. Coordinates are real and
// fixed, so every city's forecast comes from the same free Open-Meteo call.
// Separate from CitySlug (which drives the /[city] pages) so adding a city
// here doesn't create new pages or affect other features.
export interface WeatherCity {
  slug: string;
  name: string;
  nameJa: string;
  lat: number;
  lon: number;
}

export const WEATHER_CITIES: WeatherCity[] = [
  { slug: "tokyo", name: "Tokyo", nameJa: "東京", lat: 35.6762, lon: 139.6503 },
  { slug: "osaka", name: "Osaka", nameJa: "大阪", lat: 34.6937, lon: 135.5023 },
  { slug: "kyoto", name: "Kyoto", nameJa: "京都", lat: 35.0116, lon: 135.7681 },
  { slug: "nagoya", name: "Nagoya", nameJa: "名古屋", lat: 35.1815, lon: 136.9066 },
  { slug: "fukuoka", name: "Fukuoka", nameJa: "福岡", lat: 33.5904, lon: 130.4017 },
  { slug: "sapporo", name: "Sapporo", nameJa: "札幌", lat: 43.0618, lon: 141.3545 },
  { slug: "nara", name: "Nara", nameJa: "奈良", lat: 34.6851, lon: 135.8048 },
  { slug: "hiroshima", name: "Hiroshima", nameJa: "広島", lat: 34.3853, lon: 132.4553 },
  { slug: "kobe", name: "Kobe", nameJa: "神戸", lat: 34.6901, lon: 135.1955 },
  { slug: "sendai", name: "Sendai", nameJa: "仙台", lat: 38.2682, lon: 140.8694 },
  { slug: "kanazawa", name: "Kanazawa", nameJa: "金沢", lat: 36.5613, lon: 136.6562 },
  { slug: "okinawa", name: "Okinawa (Naha)", nameJa: "沖縄", lat: 26.2124, lon: 127.6809 },
];

export function getWeatherCity(slug: string | undefined): WeatherCity | undefined {
  return WEATHER_CITIES.find((c) => c.slug === slug);
}
