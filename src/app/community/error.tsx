"use client";

import RouteError from "@/components/ui/RouteError";

export default function CommunityError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="the community" hint="Community posts could not be loaded just now." />;
}
