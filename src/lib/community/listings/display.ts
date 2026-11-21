import { Flower2, GraduationCap, Megaphone, Music, Palette, PartyPopper, School, Sparkles, Store, Tag, Trophy, Users, Utensils, type LucideIcon } from "lucide-react";
import { photoUrl } from "@/lib/community/photos";
import { phaseOf, type Phase } from "@/lib/community/listings/time";
import type { Listing } from "@/lib/community/listings/types";

// Plain helpers (no "use client"), so server pages and client components can both use them. A "use client" file hands a server page only
// references to its exports, so anything a server page calls or indexes must not live in one.

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  "concerts-music": Music,
  "festivals-matsuri": PartyPopper,
  fireworks: Sparkles,
  "food-markets": Utensils,
  "exhibitions-art": Palette,
  "workshops-classes": GraduationCap,
  sports: Trophy,
  "school-university": School,
  "community-meetups": Users,
  "business-promotions": Store,
  "seasonal-activities": Flower2,
  "local-announcements": Megaphone,
  other: Tag,
};

export const KIND_LABEL: Record<Listing["kind"], string> = { event: "Event", announcement: "Announcement", promotion: "Promotion", activity: "Community activity" };

// Where a photograph is: a stored file in the community bucket, or (in the publishing preview) a picture still on the person's device.
export interface PhotoSrc {
  src: string;
  thumb: string;
  alt: string;
}

export function photosOf(l: Pick<Listing, "media" | "title">): PhotoSrc[] {
  return l.media.flatMap((m) => {
    if (m.kind !== "image" || !m.path) return [];
    const src = photoUrl(m.path);
    const thumb = photoUrl(m.thumbPath ?? m.path);
    return src && thumb ? [{ src, thumb, alt: m.alt ?? l.title }] : [];
  });
}

export function videoOf(l: Pick<Listing, "media">): string | null {
  return l.media.find((m) => m.kind === "video")?.videoUrl ?? null;
}

// The state of a listing in time and in the organizer's words, decided from the real dates (never stored, so it is always right).
export function stateOf(l: Listing, now: number): { phase: Phase; cancelled: boolean; postponed: boolean } {
  return { phase: phaseOf(l, now), cancelled: l.status === "cancelled", postponed: l.postponed };
}

