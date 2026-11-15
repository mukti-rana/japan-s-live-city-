"use client";

import RouteError from "@/components/ui/RouteError";

export default function EarthquakesError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="earthquake data" hint="Seismic data comes from an outside feed that may be briefly unavailable." />;
}
