"use client";

import RouteError from "@/components/ui/RouteError";

export default function EventsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="events" hint="Event listings come from outside calendars that may be briefly unavailable." />;
}
