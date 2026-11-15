"use client";

import RouteError from "@/components/ui/RouteError";

export default function ExploreError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="places to explore" hint="Place data could not be loaded just now." />;
}
