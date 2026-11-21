import { isoToJst } from "@/lib/community/listings/time";
import type { ListingInput } from "@/lib/community/listings/validation";
import type { Listing } from "@/lib/community/listings/types";

// An existing listing as the form's starting values (the dates read back in Japan time).
export function inputFromListing(l: Listing): ListingInput {
  const s = isoToJst(l.startsAt);
  const e = isoToJst(l.endsAt);
  const timed = l.kind === "event" || l.kind === "activity";
  return {
    kind: l.kind,
    title: l.title,
    summary: l.summary,
    description: l.description,
    categorySlug: l.categorySlug,
    areaId: l.areaId ?? "",
    cityLabel: l.cityLabel ?? "",
    venueName: l.venueName ?? "",
    address: l.address ?? "",
    lat: l.lat,
    lon: l.lon,
    startDate: s.date,
    startTime: l.allDay ? "" : s.time,
    endDate: l.endsAt && (l.allDay || !timed || e.date !== s.date) ? e.date : "",
    endTime: l.endsAt && timed && !l.allDay ? e.time : "",
    recurrence: l.recurrence,
    recurrenceUntil: l.recurrenceUntil ?? "",
    registrationRequired: l.registrationRequired,
    isFree: l.isFree,
    priceText: l.priceText ?? "",
    ticketUrl: l.ticketUrl ?? "",
    registrationUrl: l.registrationUrl ?? "",
    websiteUrl: l.websiteUrl ?? "",
    socialUrl: l.socialUrl ?? "",
    organizerName: l.organizerName ?? "",
    organizerContact: l.organizerContact ?? "",
    businessName: l.businessName ?? "",
    offerDetails: l.offerDetails ?? "",
    terms: l.terms ?? "",
    ageRestriction: l.ageRestriction ?? "",
    accessibility: l.accessibility ?? "",
    instructions: l.instructions ?? "",
    inquiriesEnabled: l.inquiriesEnabled,
    postponed: l.postponed,
    scheduleNote: l.scheduleNote ?? "",
    images: [],
    videoUrl: l.media.find((m) => m.kind === "video")?.videoUrl ?? "",
  };
}
