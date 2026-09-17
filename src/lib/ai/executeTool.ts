// Pure dispatcher: executes a named tool call server-side and returns both
// the raw result (fed back to Claude as the tool_result) and, when
// applicable, a structured card for the UI. Every branch is wrapped so a
// flaky upstream (RSS, Wikipedia, Open-Meteo, P2P Quake) returns an
// {error} to the model instead of crashing the request.

import { getWeather } from "@/lib/services/weather";
import { getRecentEarthquakes } from "@/lib/services/earthquake";
import { getUpcomingFestivals } from "@/lib/services/events";
import { getPopularPlaces } from "@/lib/services/places";
import { getLatestNews } from "@/lib/services/news";
import { getTrendingTopics } from "@/lib/services/trending";
import { getCity, CITY_TRAIN_LINES, type CitySlug } from "@/lib/data/cities";
import type {
  CardData,
  ItineraryCardData,
  ItineraryDay,
  ItineraryDayItem,
} from "@/lib/ai/types";

interface ToolExecutionResult {
  result: unknown;
  card: CardData | null;
}

const ITEM_CAP = 6;

function isCitySlug(value: unknown): value is CitySlug {
  return value === "tokyo" || value === "osaka" || value === "kyoto";
}

function clampLimit(value: unknown, fallback: number, max = 20): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(Math.trunc(value), 1), max)
    : fallback;
}

async function executeGetWeather(input: Record<string, unknown>): Promise<ToolExecutionResult> {
  if (!isCitySlug(input.city)) {
    return {
      result: { error: "Unknown city — only tokyo, osaka, kyoto are supported. Use web_search for other cities." },
      card: null,
    };
  }
  const city = getCity(input.city);
  if (!city) return { result: { error: "City not found." }, card: null };

  try {
    const snapshot = await getWeather(city.lat, city.lon);
    const data = { ...snapshot, city: city.name, source: "Open-Meteo" };
    return { result: data, card: { kind: "weather", data } };
  } catch {
    return { result: { error: "Weather lookup failed." }, card: null };
  }
}

function executeGetTrainStatus(input: Record<string, unknown>): ToolExecutionResult {
  if (!isCitySlug(input.city)) {
    return { result: { error: "Unknown city — only tokyo, osaka, kyoto are supported." }, card: null };
  }
  const city = getCity(input.city);
  const data = {
    city: city?.name ?? input.city,
    lines: CITY_TRAIN_LINES[input.city],
    isLive: false as const,
    disclaimer: "This is placeholder/demo line-status data — no live train operator API is connected yet.",
  };
  return { result: data, card: { kind: "train", data } };
}

async function executeGetEarthquakes(input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const limit = clampLimit(input.limit, 8);
  try {
    const events = await getRecentEarthquakes(limit);
    const data = { events, source: "P2P Quake (JMA relay)" };
    return { result: data, card: { kind: "earthquake", data } };
  } catch {
    return { result: { error: "Earthquake lookup failed." }, card: null };
  }
}

async function executeGetEvents(input: Record<string, unknown>): Promise<ToolExecutionResult> {
  try {
    let events = await getUpcomingFestivals();
    if (typeof input.city === "string" && input.city.trim()) {
      const needle = input.city.toLowerCase();
      events = events.filter((e) => e.city.toLowerCase().includes(needle));
    }
    if (input.category === "Festival" || input.category === "Fireworks") {
      events = events.filter((e) => e.category === input.category);
    }
    events = events.slice(0, ITEM_CAP);
    const data = { events };
    return { result: data, card: { kind: "events", data } };
  } catch {
    return { result: { error: "Events lookup failed." }, card: null };
  }
}

async function executeGetPlaces(input: Record<string, unknown>): Promise<ToolExecutionResult> {
  try {
    let places = await getPopularPlaces();
    if (typeof input.city === "string" && input.city.trim()) {
      places = places.filter((p) => p.city === input.city);
    }
    places = places.slice(0, ITEM_CAP);
    const data = { places };
    return { result: data, card: { kind: "places", data } };
  } catch {
    return { result: { error: "Places lookup failed." }, card: null };
  }
}

async function executeGetNews(input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const limit = clampLimit(input.limit, 8);
  try {
    const { items } = await getLatestNews();
    const trimmed = items.slice(0, limit);
    const data = { items: trimmed };
    return { result: data, card: { kind: "news", data } };
  } catch {
    return { result: { error: "News lookup failed." }, card: null };
  }
}

async function executeGetTrending(input: Record<string, unknown>): Promise<ToolExecutionResult> {
  const limit = clampLimit(input.limit, 10);
  try {
    const topics = await getTrendingTopics(limit);
    const data = { topics };
    return { result: data, card: { kind: "trending", data } };
  } catch {
    return { result: { error: "Trending lookup failed." }, card: null };
  }
}

function normalizeItinerary(input: Record<string, unknown>): ItineraryCardData {
  const title = typeof input.title === "string" && input.title.trim() ? input.title : "Your itinerary";
  const rawDays = Array.isArray(input.days) ? input.days : [];

  const days: ItineraryDay[] = rawDays
    .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
    .map((d) => {
      const label = typeof d.label === "string" && d.label.trim() ? d.label : "Day";
      const rawItems = Array.isArray(d.items) ? d.items : [];
      const items: ItineraryDayItem[] = rawItems
        .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
        .filter((i) => typeof i.time === "string" && typeof i.title === "string")
        .map((i) => ({
          time: i.time as string,
          title: i.title as string,
          note: typeof i.note === "string" ? i.note : undefined,
        }));
      return { label, items };
    })
    .filter((d) => d.items.length > 0);

  return { title, days };
}

function executePresentItinerary(input: Record<string, unknown>): ToolExecutionResult {
  const data = normalizeItinerary(input);
  return { result: { ok: true, days: data.days.length }, card: { kind: "itinerary", data } };
}

export async function executeTool(name: string, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  switch (name) {
    case "get_weather":
      return executeGetWeather(input);
    case "get_train_status":
      return executeGetTrainStatus(input);
    case "get_earthquakes":
      return executeGetEarthquakes(input);
    case "get_events":
      return executeGetEvents(input);
    case "get_places":
      return executeGetPlaces(input);
    case "get_news":
      return executeGetNews(input);
    case "get_trending":
      return executeGetTrending(input);
    case "present_itinerary":
      return executePresentItinerary(input);
    default:
      return { result: { error: `Unknown tool: ${name}` }, card: null };
  }
}

export const INTERNAL_TOOL_SOURCES: Record<string, { label: string; isLive: boolean }> = {
  get_weather: { label: "Open-Meteo", isLive: true },
  get_train_status: { label: "Demo data — no live train operator API", isLive: false },
  get_earthquakes: { label: "P2P Quake (JMA relay)", isLive: true },
  get_events: { label: "Wikipedia + curated festival calendar", isLive: true },
  get_places: { label: "Wikipedia", isLive: true },
  get_news: { label: "NHK, Japan Times, Japan Today, The Japan News (RSS)", isLive: true },
  get_trending: { label: "Wikipedia pageviews (Wikimedia)", isLive: true },
};
