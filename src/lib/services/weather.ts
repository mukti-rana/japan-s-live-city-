// Real live weather from Open-Meteo — free, no API key required.
// Cached for 10 minutes via Next.js fetch revalidation.

const WEATHER_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm, hail",
  99: "Thunderstorm, hail",
};

export type WeatherIconKind =
  | "clear"
  | "partly"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

function iconKindFor(code: number): WeatherIconKind {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloud";
}

export interface WeatherSnapshot {
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKmh: number;
  condition: string;
  icon: WeatherIconKind;
  sunrise: string;
  sunset: string;
  todayHigh: number;
  todayLow: number;
  updatedAt: string;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;

  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) {
    throw new Error(`Open-Meteo responded with ${res.status}`);
  }

  const data = (await res.json()) as {
    current: {
      time: string;
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      weather_code: number;
      wind_speed_10m: number;
    };
    daily: {
      sunrise: string[];
      sunset: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
    };
  };

  const time = (iso: string) => iso.slice(11, 16);

  return {
    tempC: Math.round(data.current.temperature_2m),
    feelsLikeC: Math.round(data.current.apparent_temperature),
    humidity: data.current.relative_humidity_2m,
    windKmh: Math.round(data.current.wind_speed_10m),
    condition: WEATHER_LABELS[data.current.weather_code] ?? "Unknown",
    icon: iconKindFor(data.current.weather_code),
    sunrise: time(data.daily.sunrise[0]),
    sunset: time(data.daily.sunset[0]),
    todayHigh: Math.round(data.daily.temperature_2m_max[0]),
    todayLow: Math.round(data.daily.temperature_2m_min[0]),
    updatedAt: data.current.time,
  };
}
