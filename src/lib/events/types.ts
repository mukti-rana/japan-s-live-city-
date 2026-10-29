export type EventKind =
  | "festival"
  | "fireworks"
  | "music"
  | "food"
  | "culture"
  | "art"
  | "sports"
  | "community"
  | "other";

export type EventStatus = "scheduled" | "cancelled" | "postponed";

// What kind of source an event came from — shown to the reader, never hidden.
//  municipal-open-data: published by a city/prefecture as open data.
//  annual-reference:    a well-known annual festival; the date is its usual
//                       schedule worked out for this year, NOT confirmed.
export type SourceType = "municipal-open-data" | "annual-reference";

export interface DateRange {
  // Calendar dates in Japan time, "YYYY-MM-DD".
  start: string;
  end: string;
}

export interface EventImage {
  url: string;
  credit: string;
  // Licence note exactly as the source gives it, if it does.
  licence: string | null;
  // Page to link the credit to.
  pageUrl: string | null;
}

export interface EventSource {
  id: string;
  name: string;
  type: SourceType;
  // Where the data set or reference is published.
  url: string;
}

export interface EventItem {
  id: string;
  title: string;
  kind: EventKind;
  status: EventStatus;
  // One or more date ranges (a series of classes has several).
  ranges: DateRange[];
  startTime: string | null;
  endTime: string | null;
  // Free-text date remarks from the source, shown as given.
  dateNote: string | null;
  venue: string | null;
  address: string | null;
  prefectureId: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  // True when lat/lon is only the centre of the city, not the venue.
  locationApprox: boolean;
  description: string | null;
  // The organizer's or city's own page for the event.
  url: string | null;
  organizer: string | null;
  // `free` is only true/false when the source states it; otherwise null.
  price: { free: boolean | null; text: string | null };
  familyFriendly: boolean;
  image: EventImage | null;
  source: EventSource;
  // When the source says the event was listed/announced, if it does.
  announcedAt: string | null;
  // When the source's data was last changed (not the event date).
  sourceUpdatedAt: string | null;
  // Annual-reference events only: dates are the usual schedule, unconfirmed.
  typicalDates: boolean;
}

export interface SourceStatus {
  id: string;
  name: string;
  type: SourceType;
  ok: boolean;
  // Events from this source that are current or upcoming.
  count: number;
  updatedAt: string | null;
  checkedAt: number;
  error?: string;
}
