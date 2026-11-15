"use client";

import RouteError from "@/components/ui/RouteError";

export default function TrendingError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="what's trending" hint="Trend data comes from an outside feed that may be briefly unavailable." />;
}
