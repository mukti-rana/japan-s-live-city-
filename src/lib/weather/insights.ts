import type { HourlyPoint, WeatherSnapshot } from "@/lib/services/weather";

// Everything here is derived only from the real forecast values passed in.
// Nothing is guessed: if a number isn't in the data, the function says so
// instead of inventing one. Wording is returned as translation keys so the
// selected language applies everywhere.

export type TempBand = "cold" | "cool" | "mild" | "warm" | "hot";

export function tempBand(tempC: number): TempBand {
  if (tempC < 10) return "cold";
  if (tempC < 18) return "cool";
  if (tempC < 25) return "mild";
  if (tempC < 30) return "warm";
  return "hot";
}

export type RainOutlook = "unlikely" | "possible" | "likely";

export function rainOutlook(probability: number): RainOutlook {
  if (probability >= 50) return "likely";
  if (probability >= 20) return "possible";
  return "unlikely";
}

export function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}

export function clockOf(time: string): string {
  return time.slice(11, 16);
}

export function maxRain(points: HourlyPoint[]): number {
  return points.reduce((max, p) => Math.max(max, p.precipProbability), 0);
}

export function firstLikelyRainPoint(points: HourlyPoint[]): HourlyPoint | undefined {
  return points.find((p) => p.precipProbability >= 50);
}

export function temperatureTrend(points: HourlyPoint[]): "fall" | "rise" | "steady" {
  if (points.length < 2) return "steady";
  const change = points[points.length - 1].tempC - points[0].tempC;
  if (change <= -2) return "fall";
  if (change >= 2) return "rise";
  return "steady";
}

export type DaySegment = "morning" | "afternoon" | "evening" | "night";

export function segmentOf(hour: number): DaySegment {
  if (hour >= 6 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 17) return "afternoon";
  if (hour >= 18 && hour <= 21) return "evening";
  return "night";
}

// Average forecast temperature for each part of the day, from the hours
// actually present in the forecast. A segment with no forecast hours is null
// — shown as unavailable rather than filled in.
export function segmentAverages(points: HourlyPoint[]): Record<DaySegment, number | null> {
  const buckets: Record<DaySegment, number[]> = { morning: [], afternoon: [], evening: [], night: [] };
  for (const p of points) buckets[segmentOf(hourOf(p.time))].push(p.tempC);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  return {
    morning: avg(buckets.morning),
    afternoon: avg(buckets.afternoon),
    evening: avg(buckets.evening),
    night: avg(buckets.night),
  };
}

export type Tone = "good" | "caution" | "neutral";

export interface Recommendation {
  key:
    | "weather.v2.rec.clothingWarm"
    | "weather.v2.rec.clothingJacket"
    | "weather.v2.rec.clothingLight"
    | "weather.v2.rec.umbrellaCarry"
    | "weather.v2.rec.umbrellaNone"
    | "weather.v2.rec.outdoorsGood"
    | "weather.v2.rec.outdoorsAvoid"
    | "weather.v2.rec.sightseeingGood"
    | "weather.v2.rec.sunscreen";
  tone: Tone;
}

export function recommendationsFor(snapshot: WeatherSnapshot): Recommendation[] {
  const next12 = snapshot.hourly.slice(0, 12);
  const rain = Math.max(snapshot.todayPrecipProbability, maxRain(next12));
  const feels = snapshot.feelsLikeC;
  const windy = snapshot.windKmh >= 40;
  const stormy = snapshot.icon === "storm";
  const badOutside = rain >= 50 || windy || stormy;
  const extremeTemp = feels < 5 || feels > 32;

  const recs: Recommendation[] = [
    {
      key:
        feels < 10
          ? "weather.v2.rec.clothingWarm"
          : feels < 18
            ? "weather.v2.rec.clothingJacket"
            : "weather.v2.rec.clothingLight",
      tone: "neutral",
    },
    rain >= 20
      ? { key: "weather.v2.rec.umbrellaCarry", tone: "caution" }
      : { key: "weather.v2.rec.umbrellaNone", tone: "good" },
    badOutside
      ? { key: "weather.v2.rec.outdoorsAvoid", tone: "caution" }
      : { key: "weather.v2.rec.outdoorsGood", tone: "good" },
    badOutside || extremeTemp
      ? { key: "weather.v2.rec.outdoorsAvoid", tone: "caution" }
      : { key: "weather.v2.rec.sightseeingGood", tone: "good" },
  ];

  if (snapshot.todayUvIndex >= 6) recs.push({ key: "weather.v2.rec.sunscreen", tone: "caution" });
  return recs;
}
