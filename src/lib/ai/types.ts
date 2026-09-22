// Shared wire contract between the LIVE CITY AI API route (server) and the
// chat UI (client) — imported by both so they never drift.

import type { WeatherSnapshot } from "@/lib/services/weather";
import type { EarthquakeEvent } from "@/lib/services/earthquake";
import type { EnrichedPlace } from "@/lib/services/places";
import type { EnrichedFestival } from "@/lib/services/events";
import type { NewsItem } from "@/lib/services/news";
import type { TrendingTopic } from "@/lib/services/trending";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WeatherCardData extends WeatherSnapshot {
  city: string;
  source: string;
}

export interface TrainLine {
  name: string;
  color: string;
  status: string;
  category?: "jr" | "private" | "subway";
  delayMinutes?: number;
  note?: string;
}

export interface TrainCardData {
  city: string;
  lines: TrainLine[];
  isLive: false;
  disclaimer: string;
}

export interface EarthquakeCardData {
  events: EarthquakeEvent[];
  source: string;
}

export interface PlacesCardData {
  places: EnrichedPlace[];
}

export interface EventsCardData {
  events: EnrichedFestival[];
}

export interface NewsCardData {
  items: NewsItem[];
}

export interface TrendingCardData {
  topics: TrendingTopic[];
}

export interface ItineraryDayItem {
  time: string;
  title: string;
  note?: string;
}

export interface ItineraryDay {
  label: string;
  items: ItineraryDayItem[];
}

export interface ItineraryCardData {
  title: string;
  days: ItineraryDay[];
}

export interface WebSourceLink {
  title: string;
  url: string;
}

export interface InternalSourceLabel {
  tool: string;
  label: string;
  isLive: boolean;
}

export interface SourcesCardData {
  webResults: WebSourceLink[];
  internalSources: InternalSourceLabel[];
}

export type CardData =
  | { kind: "weather"; data: WeatherCardData }
  | { kind: "train"; data: TrainCardData }
  | { kind: "earthquake"; data: EarthquakeCardData }
  | { kind: "places"; data: PlacesCardData }
  | { kind: "events"; data: EventsCardData }
  | { kind: "news"; data: NewsCardData }
  | { kind: "trending"; data: TrendingCardData }
  | { kind: "itinerary"; data: ItineraryCardData }
  | { kind: "sources"; data: SourcesCardData };

export type CardKind = CardData["kind"];

export type StreamEvent =
  | { type: "tool_start"; tool: string; id: string }
  | { type: "tool_end"; tool: string; id: string }
  | { type: "text"; delta: string }
  | { type: "card"; card: CardData }
  | { type: "error"; message: string }
  | { type: "done" };
