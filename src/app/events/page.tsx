import type { Metadata } from "next";
import EventsHub from "@/components/events/EventsHub";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";
import { eventFiltersFromParams } from "@/lib/events/hubFilters";

export const metadata: Metadata = {
  title: "Events & Festivals in Japan — Live City Japan",
  description:
    "Festivals, fireworks, markets and local events near you and across Japan, from official city and prefecture calendars, with clear source and freshness for every listing.",
};

// The list itself is loaded in the browser from /api/events, the single shared
// events service (also used by Home). Rendering it here as well would keep a
// second copy of every source's data on the server and fetch each one twice.
export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const filters = eventFiltersFromParams(await searchParams);

  return (
    <LiveLocationProvider>
      <div className="mx-auto w-full max-w-[1400px]">
        <EventsHub initialFilters={filters} initialResult={null} />
      </div>
    </LiveLocationProvider>
  );
}
