// Resolves each curated festival's real recurring date rule against today's
// date (see src/lib/data/events.ts for why this exists instead of a live
// events API) and enriches it with a real one-line description from
// Wikipedia's free summary API — same pattern as places.ts.

import { FESTIVALS, type FestivalInfo, type DateRule } from "@/lib/data/events";

export interface EventOccurrence {
  start: Date;
  end: Date;
  status: "ongoing" | "upcoming";
  daysUntil: number;
}

export interface EnrichedFestival extends FestivalInfo {
  description: string | null;
  wikipediaUrl: string;
  occurrence: EventOccurrence;
  dateLabel: string;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(year, month - 1, 1);
  const day = 1 + ((weekday - first.getDay() + 7) % 7) + (nth - 1) * 7;
  return new Date(year, month - 1, day);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastDate = new Date(year, month, 0);
  const day = lastDate.getDate() - ((lastDate.getDay() - weekday + 7) % 7);
  return new Date(year, month - 1, day);
}

function resolveStart(rule: DateRule, year: number): Date {
  switch (rule.type) {
    case "fixed":
      return new Date(year, rule.month - 1, rule.day);
    case "nthWeekday":
      return nthWeekdayOfMonth(year, rule.month, rule.weekday, rule.nth);
    case "lastWeekday":
      return lastWeekdayOfMonth(year, rule.month, rule.weekday);
  }
}

function resolveOccurrence(rule: DateRule, year: number): { start: Date; end: Date } {
  const start = resolveStart(rule, year);
  const end = new Date(start);
  end.setDate(end.getDate() + (rule.days ?? 1) - 1);
  return { start, end };
}

function getNextOccurrence(rule: DateRule, now: Date): EventOccurrence {
  const year = now.getFullYear();
  let { start, end } = resolveOccurrence(rule, year);
  if (now > end) {
    ({ start, end } = resolveOccurrence(rule, year + 1));
  }
  const ongoing = now >= start && now <= end;
  const daysUntil = ongoing
    ? 0
    : Math.ceil((start.getTime() - now.getTime()) / 86_400_000);
  return { start, end, status: ongoing ? "ongoing" : "upcoming", daysUntil };
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatDateLabel(occurrence: EventOccurrence): string {
  const { start, end } = occurrence;
  if (start.toDateString() === end.toDateString()) {
    return DATE_FORMAT.format(start);
  }
  if (start.getMonth() === end.getMonth()) {
    return `${DATE_FORMAT.format(start).split(" ")[0]} ${start.getDate()}–${end.getDate()}`;
  }
  return `${DATE_FORMAT.format(start)} – ${DATE_FORMAT.format(end)}`;
}

interface WikiSummary {
  description?: string;
  content_urls?: { desktop?: { page?: string } };
}

async function enrich(festival: FestivalInfo, now: Date): Promise<EnrichedFestival> {
  const occurrence = getNextOccurrence(festival.dateRule, now);
  const fallbackUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(festival.wikipediaTitle)}`;

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(festival.wikipediaTitle)}`,
      {
        next: { revalidate: 86400 },
        headers: { "User-Agent": "LiveCityJapan/1.0 (educational project)" },
      },
    );

    if (!res.ok) {
      return { ...festival, description: null, wikipediaUrl: fallbackUrl, occurrence, dateLabel: formatDateLabel(occurrence) };
    }

    const data = (await res.json()) as WikiSummary;
    return {
      ...festival,
      description: data.description ?? null,
      wikipediaUrl: data.content_urls?.desktop?.page ?? fallbackUrl,
      occurrence,
      dateLabel: formatDateLabel(occurrence),
    };
  } catch {
    return { ...festival, description: null, wikipediaUrl: fallbackUrl, occurrence, dateLabel: formatDateLabel(occurrence) };
  }
}

export async function getUpcomingFestivals(): Promise<EnrichedFestival[]> {
  const now = new Date();
  const enriched = await Promise.all(FESTIVALS.map((f) => enrich(f, now)));

  return enriched.sort((a, b) => {
    if (a.occurrence.status !== b.occurrence.status) {
      return a.occurrence.status === "ongoing" ? -1 : 1;
    }
    return a.occurrence.daysUntil - b.occurrence.daysUntil;
  });
}
