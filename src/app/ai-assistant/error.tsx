"use client";

import RouteError from "@/components/ui/RouteError";

export default function AiAssistantError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="the assistant" hint="The assistant could not be reached. Your conversation is not lost." />;
}
