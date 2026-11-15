"use client";

import RouteError from "@/components/ui/RouteError";

export default function CalendarError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="your calendar" hint="Your saved items are kept on this device and have not been lost." />;
}
