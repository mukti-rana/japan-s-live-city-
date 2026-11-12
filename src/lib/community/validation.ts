import { isAreaId } from "@/lib/community/areas";
import { isCategorySlug } from "@/lib/community/categories";
import { PLACE_REF_RE } from "@/lib/community/placeTypes";

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
  if (placeRefRaw && !PLACE_REF_RE.test(placeRefRaw)) errors.placeRef = MESSAGES.placeRef;
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

// ───────────────────────── reviews ─────────────────────────

export const REVIEW_LIMITS = { bodyMin: 10, bodyMax: 2000, maxPhotos: 4 } as const;

export interface ReviewFields {
  placeRef: string;
  rating: number;
  body: string;
  recommend: boolean;
  visitDate: string | null;
  rightsConfirmed: boolean;
}

export interface ReviewInput extends ReviewFields {
  // Photos newly uploaded for this review, and (when editing) existing photos to keep.
  uploadPaths: string[];
  keepPaths: string[];
}

export type ReviewErrors = Partial<Record<keyof ReviewInput, string>>;

export const REVIEW_MESSAGES = {
  rating: "Choose a star rating from 1 to 5.",
  bodyShort: "If you write a review, please use at least 10 characters.",
  bodyLong: "The review can be up to 2,000 characters.",
  bodyLinks: "Please keep links out of the review (two at most).",
  recommend: "Please say whether you would recommend this place.",
  photosMany: "You can add up to 4 photos.",
  placeRef: "That place could not be found.",
} as const;

// A star rating on its own is welcome; words are optional, but if there are some
// they should say something (not just "ok").
export function validateReviewFields(raw: Record<string, unknown>, hasPhotos: boolean, now: Date = new Date()): { ok: true; value: ReviewFields } | { ok: false; errors: ReviewErrors } {
  const errors: ReviewErrors = {};
  const placeRef = typeof raw.placeRef === "string" ? raw.placeRef.trim() : "";
  const body = cleanText(raw.body, true);
  const visitRaw = typeof raw.visitDate === "string" ? raw.visitDate.trim() : "";
  const rating = raw.rating;

  if (!PLACE_REF_RE.test(placeRef)) errors.placeRef = REVIEW_MESSAGES.placeRef;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = REVIEW_MESSAGES.rating;
  if (body && body.length < REVIEW_LIMITS.bodyMin) errors.body = REVIEW_MESSAGES.bodyShort;
  else if (body.length > REVIEW_LIMITS.bodyMax) errors.body = REVIEW_MESSAGES.bodyLong;
  else if (countLinks(body) > LIMITS.maxLinksInCaption) errors.body = REVIEW_MESSAGES.bodyLinks;
  if (typeof raw.recommend !== "boolean") errors.recommend = REVIEW_MESSAGES.recommend;
  if (visitRaw && !isValidVisitDate(visitRaw, now)) errors.visitDate = MESSAGES.date;
  if (hasPhotos && raw.rightsConfirmed !== true) errors.rightsConfirmed = MESSAGES.rights;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { placeRef, rating: rating as number, body, recommend: raw.recommend as boolean, visitDate: visitRaw || null, rightsConfirmed: raw.rightsConfirmed === true } };
}

// The whole review submission as the server receives it.
export function validateReviewInput(raw: unknown, now: Date = new Date()): { ok: true; value: ReviewInput } | { ok: false; errors: ReviewErrors } {
  if (!raw || typeof raw !== "object") return { ok: false, errors: { rating: REVIEW_MESSAGES.rating } };
  const r = raw as Record<string, unknown>;
  const upload = Array.isArray(r.uploadPaths) ? r.uploadPaths : [];
  const keep = Array.isArray(r.keepPaths) ? r.keepPaths : [];
  const fields = validateReviewFields(r, upload.length > 0, now);
  const errors: ReviewErrors = fields.ok ? {} : { ...fields.errors };

  const all = [...upload, ...keep];
  if (all.length > REVIEW_LIMITS.maxPhotos) errors.uploadPaths = REVIEW_MESSAGES.photosMany;
  else if (!all.every((p) => typeof p === "string" && UPLOAD_PATH_RE.test(p)) || new Set(all).size !== all.length) errors.uploadPaths = MESSAGES.photoPaths;

  if (!fields.ok || Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...fields.value, uploadPaths: upload as string[], keepPaths: keep as string[] } };
}

// ───────────────────────── discussion: comments, questions, answers ─────────────────────────

export const DISCUSSION_LIMITS = {
  commentMax: 1000,
  maxLinksInComment: 1,
  questionTitleMin: 5,
  questionTitleMax: 150,
  questionBodyMax: 2000,
  answerMin: 10,
  answerMax: 3000,
} as const;

export const DISCUSSION_MESSAGES = {
  commentEmpty: "Write something before posting.",
  commentLong: "A comment can be up to 1,000 characters.",
  commentLinks: "Please keep links out of comments (one at most).",
  target: "That can't be commented on.",
  parent: "That comment could not be found.",
  questionTitleShort: "Give your question a title of at least 5 characters.",
  questionTitleLong: "The title can be up to 150 characters.",
  questionBodyLong: "The details can be up to 2,000 characters.",
  questionArea: "Choose where in Japan your question is about.",
  answerShort: "Please write at least 10 characters.",
  answerLong: "An answer can be up to 3,000 characters.",
  answerLinks: "Please keep links out of answers (two at most).",
  question: "That question could not be found.",
} as const;

export interface CommentInput {
  targetType: "post" | "answer";
  targetId: string;
  parentId: string | null;
  body: string;
}
export type CommentErrors = Partial<Record<keyof CommentInput, string>>;

export function validateCommentBody(value: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const body = cleanText(value, true);
  if (!body) return { ok: false, error: DISCUSSION_MESSAGES.commentEmpty };
  if (body.length > DISCUSSION_LIMITS.commentMax) return { ok: false, error: DISCUSSION_MESSAGES.commentLong };
  if (countLinks(body) > DISCUSSION_LIMITS.maxLinksInComment) return { ok: false, error: DISCUSSION_MESSAGES.commentLinks };
  return { ok: true, body };
}

export function validateCommentInput(raw: unknown): { ok: true; value: CommentInput } | { ok: false; errors: CommentErrors } {
  if (!raw || typeof raw !== "object") return { ok: false, errors: { body: DISCUSSION_MESSAGES.commentEmpty } };
  const r = raw as Record<string, unknown>;
  const errors: CommentErrors = {};
  const targetType = r.targetType === "post" || r.targetType === "answer" ? r.targetType : null;
  const targetId = typeof r.targetId === "string" && UUID_RE.test(r.targetId) ? r.targetId : "";
  const parentId = r.parentId === null || r.parentId === undefined || r.parentId === "" ? null : typeof r.parentId === "string" && UUID_RE.test(r.parentId) ? r.parentId : "bad";
  const body = validateCommentBody(r.body);
  if (!targetType || !targetId) errors.targetId = DISCUSSION_MESSAGES.target;
  if (parentId === "bad") errors.parentId = DISCUSSION_MESSAGES.parent;
  if (!body.ok) errors.body = body.error;
  if (Object.keys(errors).length || !body.ok || !targetType) return { ok: false, errors };
  return { ok: true, value: { targetType, targetId, parentId: parentId as string | null, body: body.body } };
}

export interface QuestionFields {
  title: string;
  body: string;
  areaId: string;
  placeRef: string | null;
}
export type QuestionErrors = Partial<Record<keyof QuestionFields | "resolved", string>>;

export function validateQuestionFields(raw: Record<string, unknown>): { ok: true; value: QuestionFields } | { ok: false; errors: QuestionErrors } {
  const errors: QuestionErrors = {};
  const title = cleanText(raw.title);
  const body = cleanText(raw.body, true);
  const areaId = typeof raw.areaId === "string" ? raw.areaId : "";
  const placeRefRaw = typeof raw.placeRef === "string" ? raw.placeRef.trim() : "";
  if (title.length < DISCUSSION_LIMITS.questionTitleMin) errors.title = DISCUSSION_MESSAGES.questionTitleShort;
  else if (title.length > DISCUSSION_LIMITS.questionTitleMax) errors.title = DISCUSSION_MESSAGES.questionTitleLong;
  if (body.length > DISCUSSION_LIMITS.questionBodyMax) errors.body = DISCUSSION_MESSAGES.questionBodyLong;
  else if (countLinks(body) > LIMITS.maxLinksInCaption) errors.body = MESSAGES.captionLinks;
  if (!isAreaId(areaId)) errors.areaId = DISCUSSION_MESSAGES.questionArea;
  if (placeRefRaw && !PLACE_REF_RE.test(placeRefRaw)) errors.placeRef = MESSAGES.placeRef;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, body, areaId, placeRef: placeRefRaw || null } };
}

export function validateAnswerInput(raw: unknown): { ok: true; value: { questionId: string; body: string } } | { ok: false; errors: { questionId?: string; body?: string } } {
  if (!raw || typeof raw !== "object") return { ok: false, errors: { body: DISCUSSION_MESSAGES.answerShort } };
  const r = raw as Record<string, unknown>;
  const errors: { questionId?: string; body?: string } = {};
  const questionId = typeof r.questionId === "string" && UUID_RE.test(r.questionId) ? r.questionId : "";
  const body = cleanText(r.body, true);
  if (!questionId) errors.questionId = DISCUSSION_MESSAGES.question;
  if (body.length < DISCUSSION_LIMITS.answerMin) errors.body = DISCUSSION_MESSAGES.answerShort;
  else if (body.length > DISCUSSION_LIMITS.answerMax) errors.body = DISCUSSION_MESSAGES.answerLong;
  else if (countLinks(body) > LIMITS.maxLinksInCaption) errors.body = DISCUSSION_MESSAGES.answerLinks;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { questionId, body } };
}

// For editing an answer: just the words.
export function validateAnswerBody(value: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const r = validateAnswerInput({ questionId: "00000000-0000-0000-0000-000000000000", body: value });
  return r.ok ? { ok: true, body: r.value.body } : { ok: false, error: r.errors.body ?? DISCUSSION_MESSAGES.answerShort };
}

// ───────────────────────── profiles ─────────────────────────

export const PROFILE_LIMITS = { displayNameMax: 40, bioMax: 280, maxLinksInBio: 1 } as const;
export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

// Names that could pass for the site or its staff. (The database refuses them too.)
export const RESERVED_USERNAMES = ["admin", "administrator", "moderator", "mod", "support", "staff", "official", "system", "root", "help", "livecity", "live_city", "livecityjapan", "null", "undefined", "anonymous"];

export const PROFILE_MESSAGES = {
  usernameFormat: "Usernames use 3 to 24 lowercase letters, numbers or underscores.",
  usernameTaken: "That username is not available.",
  displayNameLong: "Your display name can be up to 40 characters.",
  bioLong: "Your bio can be up to 280 characters.",
  bioLinks: "Please keep links out of your bio (one at most).",
} as const;

export interface ProfileInput {
  username: string;
  displayName: string | null;
  bio: string | null;
  showStats: boolean;
  showVisited: boolean;
}
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

// `currentUsername` is the person's present username: keeping it is always fine,
// while a new name may not be reserved or look like someone else's generated one.
export function validateProfileInput(raw: unknown, currentUsername: string): { ok: true; value: ProfileInput } | { ok: false; errors: ProfileErrors } {
  if (!raw || typeof raw !== "object") return { ok: false, errors: { username: PROFILE_MESSAGES.usernameFormat } };
  const r = raw as Record<string, unknown>;
  const errors: ProfileErrors = {};
  const username = typeof r.username === "string" ? r.username.trim().toLowerCase() : "";
  const displayName = cleanText(r.displayName) || null;
  const bio = cleanText(r.bio, true) || null;

  if (!USERNAME_RE.test(username)) errors.username = PROFILE_MESSAGES.usernameFormat;
  else if (username !== currentUsername && (RESERVED_USERNAMES.includes(username) || username.startsWith("traveler_"))) errors.username = PROFILE_MESSAGES.usernameTaken;
  if (displayName && displayName.length > PROFILE_LIMITS.displayNameMax) errors.displayName = PROFILE_MESSAGES.displayNameLong;
  if (bio && bio.length > PROFILE_LIMITS.bioMax) errors.bio = PROFILE_MESSAGES.bioLong;
  else if (bio && countLinks(bio) > PROFILE_LIMITS.maxLinksInBio) errors.bio = PROFILE_MESSAGES.bioLinks;
  if (typeof r.showStats !== "boolean") errors.showStats = PROFILE_MESSAGES.usernameFormat;
  if (typeof r.showVisited !== "boolean") errors.showVisited = PROFILE_MESSAGES.usernameFormat;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { username, displayName, bio, showStats: r.showStats as boolean, showVisited: r.showVisited as boolean } };
}
