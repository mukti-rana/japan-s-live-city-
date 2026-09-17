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

export interface ForecastDay {
  date: string;
  weekday: string;
  high: number;
  low: number;
  icon: WeatherIconKind;
  condition: string;
  precipProbability: number;
}

export interface HourlyPoint {
  time: string;
  hourLabel: string;
  tempC: number;
  icon: WeatherIconKind;
  precipProbability: number;
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
  todayPrecipProbability: number;
  updatedAt: string;
  forecast: ForecastDay[];
  hourly: HourlyPoint[];
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Tokyo" });

export async function getWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=7&timezone=Asia%2FTokyo`;

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
    hourly: {
      time: string[];
      temperature_2m: number[];
      weather_code: number[];
      precipitation_probability: number[];
    };
    daily: {
      time: string[];
      sunrise: string[];
      sunset: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      weather_code: number[];
      precipitation_probability_max: number[];
    };
  };

  const time = (iso: string) => iso.slice(11, 16);

  // index 0 is today (already shown as the current snapshot above) — the
  // forecast strip covers the next 5 real days from the same response,
  // no extra request needed.
  const forecast: ForecastDay[] = data.daily.time.slice(1, 6).map((dateStr, i) => {
    const idx = i + 1;
    const code = data.daily.weather_code[idx];
    return {
      date: dateStr,
      weekday: WEEKDAY_FORMAT.format(new Date(`${dateStr}T00:00:00+09:00`)),
      high: Math.round(data.daily.temperature_2m_max[idx]),
      low: Math.round(data.daily.temperature_2m_min[idx]),
      icon: iconKindFor(code),
      condition: WEATHER_LABELS[code] ?? "Unknown",
      precipProbability: data.daily.precipitation_probability_max[idx] ?? 0,
    };
  });

  // Find the hourly slot matching the current hour so hourly[0] can be
  // labeled "Now" and use the already-fetched current temperature.
  const currentHourStr = `${data.current.time.slice(0, 13)}:00`;
  const startIdx = Math.max(data.hourly.time.indexOf(currentHourStr), 0);

  const hourly: HourlyPoint[] = data.hourly.time.slice(startIdx, startIdx + 24).map((t, i) => {
    const idx = startIdx + i;
    return {
      time: t,
      hourLabel: i === 0 ? "Now" : time(t),
      tempC: i === 0 ? Math.round(data.current.temperature_2m) : Math.round(data.hourly.temperature_2m[idx]),
      icon: iconKindFor(data.hourly.weather_code[idx]),
      precipProbability: data.hourly.precipitation_probability[idx] ?? 0,
    };
  });

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
    todayPrecipProbability: data.daily.precipitation_probability_max[0] ?? 0,
    updatedAt: data.current.time,
    forecast,
    hourly,
  };
}
