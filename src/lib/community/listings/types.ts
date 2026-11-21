// What a listing looks like to the pages. (The table is community_listings, migration 0013.)

export type ListingKind = "event" | "announcement" | "promotion" | "activity";
export const LISTING_KINDS: ListingKind[] = ["event", "announcement", "promotion", "activity"];

export type ListingStatus = "draft" | "pending" | "published" | "rejected" | "hidden" | "expired" | "cancelled";

// Readers see these; everything else is private to the author and the moderators.
export const PUBLIC_STATUSES: ListingStatus[] = ["published", "cancelled", "expired"];

export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export const RECURRENCES: Recurrence[] = ["none", "daily", "weekly", "monthly"];

export interface ListingMedia {
  kind: "image" | "video";
  path: string | null;
  thumbPath: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  videoUrl: string | null;
  position: number;
}

export interface Listing {
  id: string;
  // The author's id (public, like their profile). Pages compare it with the signed-in person to show the author's own controls.
  userId: string;
  kind: ListingKind;
  status: ListingStatus;
  title: string;
  summary: string;
  description: string;
  categorySlug: string;
  areaId: string | null;
  cityLabel: string | null;
  venueName: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  recurrence: Recurrence;
  recurrenceUntil: string | null;
  registrationRequired: boolean;
  isFree: boolean;
  priceText: string | null;
  ticketUrl: string | null;
  registrationUrl: string | null;
  websiteUrl: string | null;
  socialUrl: string | null;
  organizerName: string | null;
  organizerContact: string | null;
  businessName: string | null;
  offerDetails: string | null;
  terms: string | null;
  ageRestriction: string | null;
  accessibility: string | null;
  instructions: string | null;
  inquiriesEnabled: boolean;
  postponed: boolean;
  scheduleNote: string | null;
  featured: boolean;
  sponsored: boolean;
  // Only ever filled for the author and moderators (the database hides held listings from everyone else).
  holdReason: string | null;
  interestedCount: number;
  goingCount: number;
  saveCount: number;
  questionCount: number;
  publishedAt: string | null;
  createdAt: string;
  author: { username: string; avatarUrl: string | null };
  media: ListingMedia[];
}
