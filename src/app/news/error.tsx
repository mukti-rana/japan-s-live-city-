"use client";

import RouteError from "@/components/ui/RouteError";

export default function NewsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="the news" hint="News is gathered from several outside sources; one of them may be down." />;
}
