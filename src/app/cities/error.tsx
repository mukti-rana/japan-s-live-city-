"use client";

import RouteError from "@/components/ui/RouteError";

export default function CitiesError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="the city list" hint="City data could not be loaded just now." />;
}
