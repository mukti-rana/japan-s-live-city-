"use client";

import RouteError from "@/components/ui/RouteError";

export default function WeatherError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="the weather" hint="Live weather comes from an outside service that may be briefly unavailable." />;
}
