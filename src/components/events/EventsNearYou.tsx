"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import EventCard from "@/components/events/EventCard";
import EventModal from "@/components/events/EventModal";
import PlacePicker from "@/components/news/PlacePicker";
import { CompactSkeleton } from "@/components/news/NewsSkeleton";
import WidgetFrame from "@/components/home/WidgetFrame";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useNewsPlace } from "@/lib/news/useNews";
import type { EventView } from "@/lib/events/query";
import { useEventsFeed } from "@/lib/events/useEvents";

// A few upcoming events for the Home page — from the same /api/events service
// and the same city logic as the Events tab. Only the city *name* is used.
export default function EventsNearYou() {
  const { t } = useLanguage();
  const placeInfo = useNewsPlace();
  const [openEvent, setOpenEvent] = useState<EventView | null>(null);

  const nearby = useEventsFeed(placeInfo.place ? { near: placeInfo.place, limit: 4 } : null);
  const nearbyEmpty = Boolean(nearby.data && nearby.data.items.length === 0);
  const needsFallback = (!placeInfo.place && !placeInfo.locating) || nearbyEmpty;
  const fallback = useEventsFeed(needsFallback ? { limit: 4 } : null);

  const items = (needsFallback ? fallback.data?.items : nearby.data?.items) ?? [];
  const loading = placeInfo.locating || (placeInfo.place ? nearby.loading || (nearbyEmpty && fallback.loading) : fallback.loading);
  const failed = placeInfo.place ? nearby.failed : fallback.failed;

  return (
    <WidgetFrame icon={CalendarDays} labelKey="events.home.title" accent="sakura">
      <PlacePicker current={placeInfo} compact />
      {nearbyEmpty && placeInfo.place && <p className="text-xs text-muted">{t("events.home.empty")}</p>}

      {loading ? (
        <div className="flex flex-col gap-4" role="status" aria-label={t("news.hub.loadingMore")}>
          <CompactSkeleton />
          <CompactSkeleton />
          <CompactSkeleton />
        </div>
      ) : failed || items.length === 0 ? (
        <p className="text-xs text-sakura">{t("events.home.unavailable")}</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {items.map((event) => (
            <li key={event.id} className="border-b border-glass-border pb-3.5 last:border-0 last:pb-0">
              <EventCard event={event} variant="compact" onOpen={setOpenEvent} />
            </li>
          ))}
        </ul>
      )}

      <Link
        href={placeInfo.place && !needsFallback ? "/events?near=1" : "/events"}
        className="mt-auto flex items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-azure focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
      >
        {t("events.home.viewAll")}
        <ArrowRight size={12} aria-hidden="true" />
      </Link>

      <EventModal event={openEvent} onClose={() => setOpenEvent(null)} />
    </WidgetFrame>
  );
}
