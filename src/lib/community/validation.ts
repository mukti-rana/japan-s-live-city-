import { isAreaId } from "@/lib/community/areas";
import { isCategorySlug } from "@/lib/community/categories";

// The rules for a new post, in one place. The browser uses them to help the
// person fix a problem before uploading anything, and the server uses the very
// same code to decide what to accept — it never trusts what the browser says.
// (A future mobile app can use the same rules too.)

export const LIMITS = {
  titleMin: 3,
  titleMax: 120,
  captionMax: 2000,
  cityMax: 80,
  placeMax: 120,
  maxPhotos: 8,
  // A photo is shrunk in the browser before upload; the server accepts no more than this.
  maxUploadBytes: 4_000_000,
  maxLinksInCaption: 2,
} as const;

export interface PostFields {
  title: string;
  caption: string;
  areaId: string;
  cityLabel: string | null;
  placeRef: string | null;
  placeLabel: string | null;
  categorySlug: string;
  visitDate: string | null;
  rightsConfirmed: boolean;
}

export interface PostInput extends PostFields {
  uploadPaths: string[];
  clientKey: string;
}

export type FieldErrors = Partial<Record<keyof PostInput, string>>;

// Messages are fixed English sentences, translated on screen like the rest of
// the interface (they are in the translation memory).
export const MESSAGES = {
  titleShort: "Give your post a title of at least 3 characters.",
  titleLong: "The title can be up to 120 characters.",
  captionLong: "The caption can be up to 2,000 characters.",
  captionLinks: "Please keep links out of the caption (two at most).",
  area: "Choose where in Japan this was.",
  category: "Choose a topic.",
  cityLong: "The city or neighbourhood can be up to 80 characters.",
  placeLong: "The place name can be up to 120 characters.",
  placeRef: "That place could not be found. Pick one from the list or type its name.",
  date: "Enter a valid visit date that is not in the future.",
  rights: "Please confirm you took these photos or have the right to share them.",
  photosNone: "Add at least one photo.",
  photosMany: "You can add up to 8 photos.",
  photoPaths: "Some photos could not be found. Please add them again.",
  clientKey: "Something went wrong. Please try again.",
} as const;

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;

// Plain text only: control and invisible direction characters are removed,
// runs of spaces collapse, and surrounding space is trimmed. (React escapes
// text when it is shown, so nothing here is "HTML cleaning".)
export function cleanText(value: unknown, multiline = false): string {
  if (typeof value !== "string") return "";
  let s = value.normalize("NFC").replace(CONTROL, "").replace(/\r\n?/g, "\n");
  s = multiline ? s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  return s.trim();
}

const countLinks = (s: string) => (s.match(/https?:\/\/|www\./gi) ?? []).length;

// Today in Japan (YYYY-MM-DD), because a visit "today" there may still be
// "tomorrow" in a visitor's own time zone.
export function todayInJapan(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isValidVisitDate(value: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return false;
  return value >= "1990-01-01" && value <= todayInJapan(now);
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const UUID_RE = new RegExp(`^${UUID}$`);
// A photo path the server issued: <user id>/<random id>.webp
export const UPLOAD_PATH_RE = new RegExp(`^${UUID}/${UUID}\\.webp$`);

// The fields a person types and picks. (No photos yet — used before upload.)
export function validateFields(raw: Record<string, unknown>, now: Date = new Date()): { ok: true; value: PostFields } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const title = cleanText(raw.title);
  const caption = cleanText(raw.caption, true);
  const cityLabel = cleanText(raw.cityLabel) || null;
  const placeLabel = cleanText(raw.placeLabel) || null;
  const placeRefRaw = typeof raw.placeRef === "string" ? raw.placeRef.trim() : "";
  const visitRaw = typeof raw.visitDate === "string" ? raw.visitDate.trim() : "";
  const areaId = typeof raw.areaId === "string" ? raw.areaId : "";
  const categorySlug = typeof raw.categorySlug === "string" ? raw.categorySlug : "";

  if (title.length < LIMITS.titleMin) errors.title = MESSAGES.titleShort;
  else if (title.length > LIMITS.titleMax) errors.title = MESSAGES.titleLong;
  if (caption.length > LIMITS.captionMax) errors.caption = MESSAGES.captionLong;
  else if (countLinks(caption) > LIMITS.maxLinksInCaption) errors.caption = MESSAGES.captionLinks;
  if (!isAreaId(areaId)) errors.areaId = MESSAGES.area;
  if (!isCategorySlug(categorySlug)) errors.categorySlug = MESSAGES.category;
  if (cityLabel && cityLabel.length > LIMITS.cityMax) errors.cityLabel = MESSAGES.cityLong;
  if (placeLabel && placeLabel.length > LIMITS.placeMax) errors.placeLabel = MESSAGES.placeLong;
  if (placeRefRaw && !/^Q[0-9]{1,12}$/.test(placeRefRaw)) errors.placeRef = MESSAGES.placeRef;
  if (visitRaw && !isValidVisitDate(visitRaw, now)) errors.visitDate = MESSAGES.date;
  if (raw.rightsConfirmed !== true) errors.rightsConfirmed = MESSAGES.rights;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      caption,
      areaId,
      cityLabel,
      placeRef: placeRefRaw || null,
      placeLabel,
      categorySlug,
      visitDate: visitRaw || null,
      rightsConfirmed: true,
    },
  };
}

// The whole submission as the server receives it.
export function validatePostInput(raw: unknown, now: Date = new Date()): { ok: true; value: PostInput } | { ok: false; errors: FieldErrors } {
  if (!raw || typeof raw !== "object") return { ok: false, errors: { title: MESSAGES.clientKey } };
  const r = raw as Record<string, unknown>;
  const fields = validateFields(r, now);
  const errors: FieldErrors = fields.ok ? {} : { ...fields.errors };

  const paths = Array.isArray(r.uploadPaths) ? r.uploadPaths : [];
  if (paths.length < 1) errors.uploadPaths = MESSAGES.photosNone;
  else if (paths.length > LIMITS.maxPhotos) errors.uploadPaths = MESSAGES.photosMany;
  else if (!paths.every((p) => typeof p === "string" && UPLOAD_PATH_RE.test(p)) || new Set(paths).size !== paths.length) errors.uploadPaths = MESSAGES.photoPaths;
  const clientKey = typeof r.clientKey === "string" && UUID_RE.test(r.clientKey) ? r.clientKey : "";
  if (!clientKey) errors.clientKey = MESSAGES.clientKey;

  if (!fields.ok || Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...fields.value, uploadPaths: paths as string[], clientKey } };
}

export const REPORT_REASONS = ["inappropriate", "fake", "spam", "harassment", "misleading", "copyright", "unsafe"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
