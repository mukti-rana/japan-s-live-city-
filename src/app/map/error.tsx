"use client";

import RouteError from "@/components/ui/RouteError";

export default function MapError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="the map" hint="The map tiles or live layers could not be reached." />;
}
