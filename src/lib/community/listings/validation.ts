import { isAreaId } from "@/lib/community/areas";
import { cleanText, UPLOAD_PATH_RE } from "@/lib/community/validation";
import { isListingCategory } from "@/lib/community/listings/categories";
import { jstToIso, DEFAULT_DURATION_MS } from "@/lib/community/listings/time";
import { LISTING_KINDS, RECURRENCES, type ListingKind, type Recurrence } from "@/lib/community/listings/types";

// The rules for a new or edited listing, in one place. The form uses them to help a person fix a problem before anything is sent, and the
// server uses the very same code to decide what to accept (it never trusts the browser). They match the database's own limits, which
// have the final say. A "draft" only has to be well-formed; "submit" also needs everything required to publish.

export const LISTING_LIMITS = {
  titleMin: 5,
  titleMax: 120,
  summaryMax: 240,
  descriptionMax: 5000,
  cityMax: 80,
  venueMax: 120,
  addressMax: 200,
  priceMax: 80,
  urlMax: 300,
  organizerMax: 100,
  contactMax: 160,
  businessMax: 100,
  offerMax: 1500,
  termsMax: 1500,
  ageMax: 100,
  accessibilityMax: 600,
  instructionsMax: 1200,
  noteMax: 300,
  maxImages: 10,
  maxYears: 2,
} as const;

// What the form holds, and what the API receives. Dates and times are the Japan-time values of the form fields.
export interface ListingInput {
  kind: ListingKind;
  title: string;
  summary: string;
  description: string;
  categorySlug: string;
  areaId: string;
  cityLabel: string;
  venueName: string;
  address: string;
  lat: number | null;
  lon: number | null;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  recurrence: Recurrence;
  recurrenceUntil: string;
  registrationRequired: boolean;
  isFree: boolean;
  priceText: string;
  ticketUrl: string;
  registrationUrl: string;
  websiteUrl: string;
  socialUrl: string;
  organizerName: string;
  organizerContact: string;
  businessName: string;
  offerDetails: string;
  terms: string;
  ageRestriction: string;
  accessibility: string;
  instructions: string;
  inquiriesEnabled: boolean;
  postponed: boolean;
  scheduleNote: string;
  // Paths returned by /api/community/upload, in order; the first is the cover.
  images: string[];
  videoUrl: string;
}

export const EMPTY_LISTING: Omit<ListingInput, "kind"> = {
  title: "",
  summary: "",
  description: "",
  categorySlug: "other",
  areaId: "",
  cityLabel: "",
  venueName: "",
  address: "",
  lat: null,
  lon: null,
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  recurrence: "none",
  recurrenceUntil: "",
  registrationRequired: false,
  isFree: true,
  priceText: "",
  ticketUrl: "",
  registrationUrl: "",
  websiteUrl: "",
  socialUrl: "",
  organizerName: "",
  organizerContact: "",
  businessName: "",
  offerDetails: "",
  terms: "",
  ageRestriction: "",
  accessibility: "",
  instructions: "",
  inquiriesEnabled: true,
  postponed: false,
  scheduleNote: "",
  images: [],
  videoUrl: "",
};

// Fixed English sentences, translated on screen like the rest of the interface.
export const LISTING_MESSAGES = {
  kind: "That kind of publication isn't available.",
  titleShort: "Give it a title of at least 5 characters.",
  titleLong: "The title can be up to 120 characters.",
  summaryLong: "The short description can be up to 240 characters.",
  descriptionLong: "The description can be up to 5,000 characters.",
  describe: "Add a short description.",
  category: "Choose a category.",
  area: "Choose where in Japan it is.",
  start: "Add when it starts.",
  startBad: "Enter a valid start date and time.",
  endBad: "Enter a valid end date and time.",
  endBefore: "The end can't be before the start.",
  tooFar: "That date is too far ahead.",
  finished: "That has already finished. Choose a date that has not passed.",
  expired: "The expiry date has already passed.",
  repeatEnd: "A repeating event needs an end date for the repeats.",
  repeatBad: "Enter a valid date for the end of the repeats.",
  price: "Add the price, or mark the entry as free.",
  url: "Enter a full web address starting with https://",
  contact: "That contact detail is too long.",
  place: "Choose the place on the map, or clear it.",
  video: "Use a YouTube or Vimeo link, or leave it empty.",
  photos: "You can add up to 10 photos.",
  photoPaths: "Some photos could not be found. Please add them again.",
  long: "That is too long.",
} as const;

export type ListingErrors = Partial<Record<keyof ListingInput, string>>;

const VIDEO_RE = /^https:\/\/((www\.)?youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/|(www\.)?vimeo\.com\/|player\.vimeo\.com\/video\/)[A-Za-z0-9_?=&/-]{3,80}$/;

// A web address: https only, no sign-in details inside it, a real host. Returns the cleaned address, "" for empty, or null when invalid.
export function cleanUrl(value: unknown): string | null {
  const raw = cleanText(value);
  if (!raw) return "";
  if (raw.length > LISTING_LIMITS.urlMax || /\s/.test(raw)) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return null;
    return u.href.length <= LISTING_LIMITS.urlMax ? u.href : null;
  } catch {
    return null;
  }
}

const orNull = (s: string) => (s === "" ? null : s);

export interface ListingRow {
  kind: ListingKind;
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
}

export interface ParsedListing {
  row: ListingRow;
  images: string[];
  videoUrl: string | null;
}

export function parseListingInput(raw: unknown, mode: "draft" | "submit", now: Date = new Date()): { ok: true; value: ParsedListing } | { ok: false; errors: ListingErrors } {
  const errors: ListingErrors = {};
  if (!raw || typeof raw !== "object") return { ok: false, errors: { title: LISTING_MESSAGES.titleShort } };
  const r = raw as Record<string, unknown>;
  const str = (k: string, multiline = false) => cleanText(r[k], multiline);
  const flag = (k: string, dflt: boolean) => (typeof r[k] === "boolean" ? (r[k] as boolean) : dflt);
  const strict = mode === "submit";

  const kind = r.kind as ListingKind;
  if (!LISTING_KINDS.includes(kind)) errors.kind = LISTING_MESSAGES.kind;
  const timed = kind === "event" || kind === "activity";

  const title = str("title");
  if (title.length === 0 || (strict && title.length < LISTING_LIMITS.titleMin)) errors.title = LISTING_MESSAGES.titleShort;
  else if (title.length > LISTING_LIMITS.titleMax) errors.title = LISTING_MESSAGES.titleLong;
  const summary = str("summary");
  if (summary.length > LISTING_LIMITS.summaryMax) errors.summary = LISTING_MESSAGES.summaryLong;
  const description = str("description", true);
  if (description.length > LISTING_LIMITS.descriptionMax) errors.description = LISTING_MESSAGES.descriptionLong;
  if (strict && !summary && !description) errors.summary = LISTING_MESSAGES.describe;

  const categorySlug = str("categorySlug") || "other";
  if (!isListingCategory(categorySlug)) errors.categorySlug = LISTING_MESSAGES.category;

  const areaId = str("areaId");
  if (areaId && !isAreaId(areaId)) errors.areaId = LISTING_MESSAGES.area;
  if (strict && (timed || kind === "promotion") && !areaId) errors.areaId = LISTING_MESSAGES.area;

  const lengthChecks: [keyof ListingInput, string, number][] = [
    ["cityLabel", str("cityLabel"), LISTING_LIMITS.cityMax],
    ["venueName", str("venueName"), LISTING_LIMITS.venueMax],
    ["address", str("address"), LISTING_LIMITS.addressMax],
    ["priceText", str("priceText"), LISTING_LIMITS.priceMax],
    ["organizerName", str("organizerName"), LISTING_LIMITS.organizerMax],
    ["organizerContact", str("organizerContact"), LISTING_LIMITS.contactMax],
    ["businessName", str("businessName"), LISTING_LIMITS.businessMax],
    ["ageRestriction", str("ageRestriction"), LISTING_LIMITS.ageMax],
    ["scheduleNote", str("scheduleNote"), LISTING_LIMITS.noteMax],
  ];
  for (const [k, v, max] of lengthChecks) if (v.length > max) errors[k] = LISTING_MESSAGES.long;
  const offerDetails = str("offerDetails", true);
  const terms = str("terms", true);
  const accessibility = str("accessibility", true);
  const instructions = str("instructions", true);
  if (offerDetails.length > LISTING_LIMITS.offerMax) errors.offerDetails = LISTING_MESSAGES.long;
  if (terms.length > LISTING_LIMITS.termsMax) errors.terms = LISTING_MESSAGES.long;
  if (accessibility.length > LISTING_LIMITS.accessibilityMax) errors.accessibility = LISTING_MESSAGES.long;
  if (instructions.length > LISTING_LIMITS.instructionsMax) errors.instructions = LISTING_MESSAGES.long;

  const urls: Record<string, string> = {};
  for (const k of ["ticketUrl", "registrationUrl", "websiteUrl", "socialUrl"] as const) {
    const u = cleanUrl(r[k]);
    if (u === null) errors[k] = LISTING_MESSAGES.url;
    else urls[k] = u;
  }
  const videoRaw = cleanText(r.videoUrl);
  if (videoRaw && !VIDEO_RE.test(videoRaw)) errors.videoUrl = LISTING_MESSAGES.video;

  // Map location: both or neither, inside Japan.
  let lat: number | null = typeof r.lat === "number" && Number.isFinite(r.lat) ? r.lat : null;
  let lon: number | null = typeof r.lon === "number" && Number.isFinite(r.lon) ? r.lon : null;
  if ((lat === null) !== (lon === null) || (lat !== null && (lat < 20 || lat > 47)) || (lon !== null && (lon < 122 || lon > 154))) {
    errors.lat = LISTING_MESSAGES.place;
    lat = null;
    lon = null;
  }

  // When.
  const startDate = str("startDate");
  const startTime = str("startTime");
  const endDate = str("endDate");
  const endTime = str("endTime");
  let startsAt: string | null = null;
  let endsAt: string | null = null;
  const allDay = Boolean(startDate) && !startTime;
  if (startDate) {
    startsAt = jstToIso(startDate, startTime || "00:00");
    if (!startsAt) errors.startDate = LISTING_MESSAGES.startBad;
  } else if (startTime) errors.startDate = LISTING_MESSAGES.startBad;
  if (strict && timed && !startDate) errors.startDate = LISTING_MESSAGES.start;
  if (endDate || endTime) {
    const day = endDate || startDate;
    // A date-only end (an all-day span, or an expiry date) runs to the end of that day.
    endsAt = day ? jstToIso(day, endTime || (allDay || !timed || !startTime ? "23:59" : startTime)) : null;
    if (!endsAt) errors.endDate = LISTING_MESSAGES.endBad;
  }
  if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) errors.endDate = LISTING_MESSAGES.endBefore;
  if (startsAt && new Date(startsAt).getTime() > now.getTime() + LISTING_LIMITS.maxYears * 365 * 86400000) errors.startDate = LISTING_MESSAGES.tooFar;

  const recurrence = (str("recurrence") || "none") as Recurrence;
  if (!RECURRENCES.includes(recurrence)) errors.recurrence = LISTING_MESSAGES.kind;
  const recurrenceUntil = str("recurrenceUntil");
  if (recurrence !== "none" && timed) {
    if (!recurrenceUntil) {
      if (strict) errors.recurrenceUntil = LISTING_MESSAGES.repeatEnd;
    } else if (!jstToIso(recurrenceUntil) || (startDate && recurrenceUntil < startDate)) errors.recurrenceUntil = LISTING_MESSAGES.repeatBad;
  }
  if (strict && !errors.startDate && !errors.endDate) {
    const t = now.getTime();
    if (timed && recurrence === "none" && startsAt && (endsAt ? new Date(endsAt).getTime() : new Date(startsAt).getTime() + DEFAULT_DURATION_MS) < t) errors.startDate = LISTING_MESSAGES.finished;
    if (!timed && endsAt && new Date(endsAt).getTime() < t) errors.endDate = LISTING_MESSAGES.expired;
  }

  const isFree = flag("isFree", true);
  const priceText = str("priceText");
  if (strict && timed && !isFree && !priceText) errors.priceText = LISTING_MESSAGES.price;

  // Photos: paths the upload step returned, no repeats, no more than the limit.
  const imagesRaw = Array.isArray(r.images) ? r.images : [];
  const images = [...new Set(imagesRaw.filter((p): p is string => typeof p === "string"))];
  if (images.length !== imagesRaw.length || images.some((p) => !UPLOAD_PATH_RE.test(p))) errors.images = LISTING_MESSAGES.photoPaths;
  else if (images.length > LISTING_LIMITS.maxImages) errors.images = LISTING_MESSAGES.photos;

  if (Object.keys(errors).length) return { ok: false, errors };

  const promo = kind === "promotion";
  return {
    ok: true,
    value: {
      images,
      videoUrl: videoRaw || null,
      row: {
        kind,
        title,
        summary,
        description,
        category_slug: categorySlug,
        area_id: orNull(areaId),
        city_label: orNull(str("cityLabel")),
        venue_name: orNull(str("venueName")),
        address: orNull(str("address")),
        lat,
        lon,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: allDay,
        recurrence: timed ? recurrence : "none",
        recurrence_until: timed && recurrence !== "none" ? orNull(recurrenceUntil) : null,
        registration_required: timed && flag("registrationRequired", false),
        is_free: timed ? isFree : true,
        price_text: timed && !isFree ? orNull(priceText) : null,
        ticket_url: timed ? orNull(urls.ticketUrl) : null,
        registration_url: orNull(urls.registrationUrl),
        website_url: orNull(urls.websiteUrl),
        social_url: orNull(urls.socialUrl),
        organizer_name: orNull(str("organizerName")),
        organizer_contact: orNull(str("organizerContact")),
        business_name: promo ? orNull(str("businessName")) : null,
        offer_details: promo ? orNull(offerDetails) : null,
        terms: promo ? orNull(terms) : null,
        age_restriction: timed ? orNull(str("ageRestriction")) : null,
        accessibility: timed ? orNull(accessibility) : null,
        instructions: timed ? orNull(instructions) : null,
        inquiries_enabled: flag("inquiriesEnabled", true),
        postponed: timed && flag("postponed", false),
        schedule_note: orNull(str("scheduleNote")),
      },
    },
  };
}
