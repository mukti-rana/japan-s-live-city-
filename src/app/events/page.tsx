import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import EventsListWidget from "@/components/home/widgets/EventsListWidget";

export const metadata: Metadata = {
  title: "Events — Live City Japan",
  description: "Festivals, concerts, and events happening across Japan.",
};

export default function EventsPage() {
  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Live
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Events
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Festivals, concerts, and things happening across Japan today.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="max-w-md">
          <EventsListWidget />
        </div>
      </Reveal>
    </div>
  );
}
