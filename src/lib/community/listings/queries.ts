import { cache } from "react";
import { classifyError, logProblem, publicClient, type FeedProblem } from "@/lib/community/queries";
import { LISTING_PAGE_SIZE, type ListingFilters } from "@/lib/community/listings/filters";
import { jstToIso, phaseOf } from "@/lib/community/listings/time";
import type { Listing, ListingKind, ListingMedia, Recurrence } from "@/lib/community/listings/types";
import type { createClient as createServerClient } from "@/lib/supabase/server";

// Reads of What's Happening. Public lists use the public (cookie-free) key; Row Level Security, not this code, limits them to published
// listings. A single listing and "my listings" use the signed-in person's own session, so authors also see their drafts and held ones.

type Db = Awaited<ReturnType<typeof createServerClient>>;

export const LISTING_SELECT =
  "id,user_id,kind,status,title,summary,description,category_slug,area_id,city_label,venue_name,address,lat,lon,starts_at,ends_at,all_day,recurrence,recurrence_until," +
  "registration_required,is_free,price_text,ticket_url,registration_url,website_url,social_url,organizer_name,organizer_contact,business_name,offer_details,terms," +
  "age_restriction,accessibility,instructions,inquiries_enabled,postponed,schedule_note,featured,sponsored,hold_reason,interested_count,going_count,save_count," +
  "question_count,published_at,created_at," +
  "profiles!community_listings_user_id_fkey(username,avatar_url)," +
  "community_listing_media(kind,storage_path,thumb_path,width,height,alt,video_url,position)";

interface Row {
  id: string;
  user_id: string;
  kind: ListingKind;
  status: Listing["status"];
  title: string;
  summary: string;
  description: string;
  category_slug: string;
  area_id: string | null;
  city_label: string | null;
  venue_name: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  recurrence: Recurrence;
  recurrence_until: string | null;
  registration_required: boolean;
  is_free: boolean;
  price_text: string | null;
  ticket_url: string | null;
  registration_url: string | null;
  website_url: string | null;
  social_url: string | null;
  organizer_name: string | null;
  organizer_contact: string | null;
  business_name: string | null;
  offer_details: string | null;
  terms: string | null;
  age_restriction: string | null;
  accessibility: string | null;
  instructions: string | null;
  inquiries_enabled: boolean;
  postponed: boolean;
  schedule_note: string | null;
  featured: boolean;
  sponsored: boolean;
  hold_reason: string | null;
  interested_count: number;
  going_count: number;
  save_count: number;
  question_count: number;
  published_at: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[] | null;
  community_listing_media: { kind: "image" | "video"; storage_path: string | null; thumb_path: string | null; width: number | null; height: number | null; alt: string | null; video_url: string | null; position: number }[] | null;
}

export function toListing(r: Row): Listing {
  const author = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
  const media: ListingMedia[] = (r.community_listing_media ?? [])
    .map((m) => ({ kind: m.kind, path: m.storage_path, thumbPath: m.thumb_path, width: m.width, height: m.height, alt: m.alt, videoUrl: m.video_url, position: m.position }))
    .sort((a, b) => a.position - b.position);
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind,
    status: r.status,
    title: r.title,
    summary: r.summary,
    description: r.description,
    categorySlug: r.category_slug,
    areaId: r.area_id,
    cityLabel: r.city_label,
    venueName: r.venue_name,
    address: r.address,
    lat: r.lat,
    lon: r.lon,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    allDay: r.all_day,
    recurrence: r.recurrence,
    recurrenceUntil: r.recurrence_until,
    registrationRequired: r.registration_required,
    isFree: r.is_free,
    priceText: r.price_text,
    ticketUrl: r.ticket_url,
    registrationUrl: r.registration_url,
    websiteUrl: r.website_url,
    socialUrl: r.social_url,
    organizerName: r.organizer_name,
    organizerContact: r.organizer_contact,
    businessName: r.business_name,
    offerDetails: r.offer_details,
    terms: r.terms,
    ageRestriction: r.age_restriction,
    accessibility: r.accessibility,
    instructions: r.instructions,
    inquiriesEnabled: r.inquiries_enabled,
    postponed: r.postponed,
    scheduleNote: r.schedule_note,
    featured: r.featured,
    sponsored: r.sponsored,
    holdReason: r.hold_reason,
    interestedCount: r.interested_count,
    goingCount: r.going_count,
    saveCount: r.save_count,
    questionCount: r.question_count,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    author: { username: author?.username ?? "member", avatarUrl: author?.avatar_url ?? null },
    media,
  };
}

export type ListingsResult = { state: "ready"; items: Listing[]; hasMore: boolean } | { state: "unavailable"; reason: FeedProblem };

// "Not finished yet" as a database filter: an event that ends later (or, with no end, started less than four hours ago), a repeating one whose repeats
// have not ended, or an announcement or promotion with no expiry date or one in the future.
function notFinished(nowMs: number): string {
  const nowIso = new Date(nowMs).toISOString();
  const recent = new Date(nowMs - 4 * 3600 * 1000).toISOString();
  const today = new Date(nowMs + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return [`ends_at.gte.${nowIso}`, `and(ends_at.is.null,starts_at.gte.${recent})`, `and(recurrence.neq.none,recurrence_until.gte.${today})`, `and(kind.in.(announcement,promotion),ends_at.is.null)`].join(",");
}

export interface ListingQuery extends ListingFilters {
  // Only listings with a map location (for the map view).
  mapOnly?: boolean;
  pageSize?: number;
  now?: number;
}

async function load(f: ListingQuery): Promise<ListingsResult> {
  const client = publicClient();
  if (!client) {
    logProblem("listings", "not_configured");
    return { state: "unavailable", reason: "not_configured" };
  }
  const now = f.now ?? Date.now();
  const size = f.pageSize ?? LISTING_PAGE_SIZE;
  let q = client.from("community_listings").select(LISTING_SELECT).eq("status", "published");
  if (f.kinds.length) q = q.in("kind", f.kinds);
  if (f.category) q = q.eq("category_slug", f.category);
  if (f.area) q = q.eq("area_id", f.area);
  if (f.price === "free") q = q.eq("is_free", true);
  if (f.price === "paid") q = q.eq("is_free", false);
  if (f.featured) q = q.eq("featured", true);
  if (f.mapOnly) q = q.not("lat", "is", null);
  const term = f.q.replace(/[%_,()\\]/g, " ").trim();
  if (term) q = q.ilike("search_text", `%${term.toLowerCase()}%`);

  if (f.date) {
    const dayStart = jstToIso(f.date, "00:00");
    const dayEnd = jstToIso(f.date, "23:59");
    if (dayStart && dayEnd) q = q.or(`and(starts_at.gte.${dayStart},starts_at.lte.${dayEnd}),and(starts_at.lte.${dayEnd},ends_at.gte.${dayStart})`);
  } else if (f.when !== "new") {
    q = q.or(notFinished(now));
  }
  if (f.when === "now") q = q.lte("starts_at", new Date(now).toISOString());

  if (f.when === "popular") q = q.order("going_count", { ascending: false }).order("interested_count", { ascending: false }).order("save_count", { ascending: false }).order("published_at", { ascending: false });
  else if (f.when === "new") q = q.order("published_at", { ascending: false });
  else q = q.order("starts_at", { ascending: true, nullsFirst: false }).order("published_at", { ascending: false });

  const from = (f.page - 1) * size;
  const { data, error } = await q.range(from, from + size);
  if (error || !data) {
    const problem = error ? classifyError(error) : "error";
    logProblem("listings", problem, error ?? undefined);
    return { state: "unavailable", reason: problem };
  }
  let items = (data as unknown as Row[]).map(toListing);
  let hasMore = items.length > size;
  items = items.slice(0, size);
  // "Happening now" is judged by the real occurrence (a repeating event is live only during one of its repeats).
  if (f.when === "now") {
    items = items.filter((l) => phaseOf(l, now) === "live");
    hasMore = false;
  }
  return { state: "ready", items, hasMore };
}

// React's cache() lets a page and its metadata share one query per request.
export const fetchListings = cache(async (key: string): Promise<ListingsResult> => load(JSON.parse(key) as ListingQuery));
export const listingsKey = (f: ListingQuery) => JSON.stringify(f);

export async function fetchListingsFor(f: ListingQuery): Promise<ListingsResult> {
  return fetchListings(listingsKey(f));
}

// One listing, through the signed-in person's session: the author and moderators see it in any state, everyone else only when public.
export async function fetchListing(client: Db, id: string): Promise<{ state: "ready"; listing: Listing } | { state: "missing" } | { state: "unavailable"; reason: FeedProblem }> {
  const { data, error } = await client.from("community_listings").select(LISTING_SELECT).eq("id", id).maybeSingle();
  if (error) {
    const problem = classifyError(error);
    logProblem("listing", problem, error);
    return { state: "unavailable", reason: problem };
  }
  return data ? { state: "ready", listing: toListing(data as unknown as Row) } : { state: "missing" };
}

export async function fetchMyListings(client: Db, userId: string): Promise<Listing[]> {
  const { data, error } = await client.from("community_listings").select(LISTING_SELECT).eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error || !data) {
    logProblem("my listings", error ? classifyError(error) : "error", error ?? undefined);
    return [];
  }
  return (data as unknown as Row[]).map(toListing);
}

// A few more like this one: the same category or prefecture, still to come, not itself.
export async function fetchRelated(l: Listing, limit = 4): Promise<Listing[]> {
  const base = { category: l.categorySlug, kinds: [l.kind] as ListingKind[] };
  const res = await fetchListingsFor({ ...emptyFilters(), ...base, pageSize: limit + 1 });
  let items = res.state === "ready" ? res.items.filter((x) => x.id !== l.id) : [];
  if (items.length < limit && l.areaId) {
    const more = await fetchListingsFor({ ...emptyFilters(), area: l.areaId, pageSize: limit + 2 });
    if (more.state === "ready") for (const x of more.items) if (x.id !== l.id && !items.some((y) => y.id === x.id)) items.push(x);
  }
  items = items.slice(0, limit);
  return items;
}

function emptyFilters(): ListingFilters {
  return { kinds: [], category: "", area: "", q: "", when: "all", price: "any", date: "", featured: false, page: 1 };
}
