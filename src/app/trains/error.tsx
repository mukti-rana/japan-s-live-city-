"use client";

import RouteError from "@/components/ui/RouteError";

export default function TrainsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="train status" hint="Railway status comes from an outside feed that may be briefly unavailable." />;
}
