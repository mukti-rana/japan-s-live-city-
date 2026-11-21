import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CommunityTabs from "@/components/community/CommunityTabs";
import ListingDetailView from "@/components/community/listings/ListingDetailView";
import OwnerControls from "@/components/community/listings/OwnerControls";
import { photosOf } from "@/components/community/listings/ListingPieces";
import Unavailable from "@/components/community/Unavailable";
import { fetchListing, fetchRelated } from "@/lib/community/listings/queries";
import { nowMs } from "@/lib/community/listings/time";
import { PUBLIC_STATUSES, type Listing } from "@/lib/community/listings/types";
import { isUuid } from "@/lib/community/listings/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Different for each reader (an author sees their own draft), so it is rendered on request, through the reader's own session.
export const dynamic = "force-dynamic";

const load = cache(async (id: string) => {
  if (!isSupabaseConfigured || !isUuid(id)) return null;
  const supabase = await createClient();
  const [res, auth] = await Promise.all([fetchListing(supabase, id), supabase.auth.getUser()]);
  return { res, userId: auth.data.user?.id ?? null };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const got = await load(id);
  if (!got || got.res.state !== "ready") return { title: "Publication — Community", robots: { index: false, follow: false } };
  const l = got.res.listing;
  const isPublic = PUBLIC_STATUSES.includes(l.status);
  const cover = photosOf(l)[0];
  const description = (l.summary || l.description).slice(0, 200);
  return {
    title: `${l.title} — Community — Live City Japan`,
    description,
    // Held, hidden and private pages are never offered to search engines.
    robots: isPublic ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical: `/community/listing/${l.id}` },
    openGraph: { title: l.title, description, type: "article", images: cover ? [{ url: cover.src }] : undefined },
  };
}

// schema.org Event data for a public event, so search engines can show it properly. Only what the publisher actually entered.
function eventJsonLd(l: Listing): string | null {
  if ((l.kind !== "event" && l.kind !== "activity") || !l.startsAt || !PUBLIC_STATUSES.includes(l.status)) return null;
  const cover = photosOf(l)[0];
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: l.title,
    description: l.summary || l.description,
    startDate: l.startsAt,
    ...(l.endsAt ? { endDate: l.endsAt } : {}),
    eventStatus: l.status === "cancelled" ? "https://schema.org/EventCancelled" : l.postponed ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(l.venueName || l.address ? { location: { "@type": "Place", name: l.venueName ?? l.cityLabel ?? "Japan", address: { "@type": "PostalAddress", streetAddress: l.address ?? undefined, addressLocality: l.cityLabel ?? undefined, addressCountry: "JP" } } } : {}),
    ...(cover ? { image: [cover.src] } : {}),
    ...(l.organizerName ? { organizer: { "@type": "Organization", name: l.organizerName } } : {}),
    ...(l.isFree || l.ticketUrl ? { offers: { "@type": "Offer", price: l.isFree ? 0 : undefined, priceCurrency: "JPY", url: l.ticketUrl ?? undefined } } : {}),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const got = await load(id);
  if (!got) notFound();
  if (got.res.state === "unavailable") {
    return (
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6">
        <CommunityTabs active="happening" />
        <Unavailable reason={got.res.reason} />
      </div>
    );
  }
  if (got.res.state === "missing") notFound();
  const l = got.res.listing;
  const now = nowMs();
  const mine = got.userId === l.userId;
  const related = PUBLIC_STATUSES.includes(l.status) ? await fetchRelated(l) : [];
  const jsonLd = eventJsonLd(l);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6">
      <CommunityTabs active={l.kind === "event" || l.kind === "activity" ? "events" : "announcements"} />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
      <ListingDetailView l={l} now={now} related={related}>
        {mine && <OwnerControls id={l.id} status={l.status} holdReason={l.holdReason} />}
      </ListingDetailView>
    </div>
  );
}
