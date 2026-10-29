import { PREFECTURES } from "@/lib/news/places";
import type { NewsParams } from "@/lib/news/queryString";
import { toQueryString } from "@/lib/news/queryString";
import { isDate } from "@/lib/events/time";

export const EVENTS_PAGE_SIZE = 12;

export type WhenId = "all" | "today" | "tomorrow" | "weekend" | "7d" | "month";
export const WHEN_IDS: WhenId[] = ["all", "today", "tomorrow", "weekend", "7d", "month"];

// Filter chips. "sports" also covers community activities, as listed on the page.
export const KIND_CHIPS = [
  { id: "festival", api: "festival" },
  { id: "fireworks", api: "fireworks" },
  { id: "music", api: "music" },
  { id: "food", api: "food" },
  { id: "culture", api: "culture" },
  { id: "art", api: "art" },
  { id: "sports", api: "sports,community" },
] as const;

export interface EventFilters {
  when: WhenId;
  near: boolean;
  kind: string;
  free: boolean;
  family: boolean;
  pref: string;
  city: string;
  q: string;
  date: string;
  sort: "date" | "announced" | "nearest";
  radius: number;
  ended: boolean;
  saved: boolean;
}

export const DEFAULT_EVENT_FILTERS: EventFilters = {
  when: "all",
  near: false,
  kind: "",
  free: false,
  family: false,
  pref: "",
  city: "",
  q: "",
  date: "",
  sort: "date",
  radius: 0,
  ended: false,
  saved: false,
};

export const RADII = [10, 25, 50, 100, 200];

export function eventFiltersFromParams(sp: Record<string, string | string[] | undefined>): EventFilters {
  const get = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const when = get("when") as WhenId;
  const radius = Number(get("radius"));
  const sort = get("sort");
  return {
    when: WHEN_IDS.includes(when) ? when : "all",
    near: get("near") === "1",
    kind: KIND_CHIPS.some((k) => k.id === get("kind")) ? get("kind") : "",
    free: get("free") === "1",
    family: get("family") === "1",
    pref: PREFECTURES.some((p) => p.id === get("pref")) ? get("pref") : "",
    city: get("city").slice(0, 60),
    q: get("q").slice(0, 100),
    date: isDate(get("date")) ? get("date") : "",
    sort: sort === "announced" || sort === "nearest" ? sort : "date",
    radius: RADII.includes(radius) ? radius : 0,
    ended: get("ended") === "1",
    saved: get("saved") === "1",
  };
}

// The address-bar form of the filters (defaults are left out).
export function eventPageQuery(f: EventFilters): string {
  return toQueryString({
    when: f.when === "all" ? "" : f.when,
    near: f.near,
    kind: f.kind,
    free: f.free,
    family: f.family,
    pref: f.pref,
    city: f.city,
    q: f.q,
    date: f.date,
    sort: f.sort === "date" ? "" : f.sort,
    radius: f.radius || "",
    ended: f.ended,
    saved: f.saved,
  });
}

// The request for one page of results.
export function eventGridParams(f: EventFilters, place: string | null, savedIds: string[], offset = 0): NewsParams {
  const kind = KIND_CHIPS.find((k) => k.id === f.kind)?.api;
  return {
    when: f.when === "all" ? "" : f.when,
    date: f.date,
    kind,
    pref: f.pref,
    city: f.city,
    q: f.q,
    free: f.free,
    family: f.family,
    near: f.near ? place : null,
    radius: f.near ? f.radius || "" : "",
    sort: f.sort === "date" ? "" : f.sort,
    status: f.ended ? "ended" : "",
    ids: f.saved ? savedIds.slice(0, 40).join(",") : "",
    limit: EVENTS_PAGE_SIZE,
    offset: offset || undefined,
  };
}
