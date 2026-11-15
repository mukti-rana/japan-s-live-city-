"use client";

import RouteError from "@/components/ui/RouteError";

export default function EmergencyError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="emergency information" hint="For a real emergency call 119 for fire or ambulance, or 110 for police." />;
}
