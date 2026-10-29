import type { Metadata } from "next";
import CalendarApp from "@/components/calendar/CalendarApp";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

export const metadata: Metadata = {
  title: "LIVE Calendar — Live City Japan",
  description:
    "A private calendar for your schedule and tasks, with Japan's official public holidays and local events. Saved on your device — no account needed.",
};

// Everything personal in the calendar stays in the visitor's browser, so the
// page itself holds nothing but the app. `?quick=` opens the quick-add reader
// with text already in it (used by the Home "Your Day" box).
export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const quick = (Array.isArray(sp.quick) ? sp.quick[0] : sp.quick) ?? "";
  return (
    <LiveLocationProvider>
      <div className="mx-auto w-full max-w-[1400px]">
        <CalendarApp initialQuick={quick.slice(0, 200)} />
      </div>
    </LiveLocationProvider>
  );
}
