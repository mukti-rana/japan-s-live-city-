import { CalendarDays } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import CardHeader from "@/components/ai/cards/CardHeader";
import PlaceTile from "@/components/ai/cards/PlaceTile";
import type { EventsCardData } from "@/lib/ai/types";

export default function EventsCard({ data }: { data: EventsCardData }) {
  return (
    <GlassCard className="flex w-full max-w-2xl flex-col gap-3 p-4">
      <CardHeader icon={CalendarDays} label="Festivals & Events" accent="sakura" />
      <div className="flex gap-3 overflow-x-auto pb-1">
        {data.events.map((event) => (
          <PlaceTile
            key={event.name}
            name={event.name}
            image={event.image}
            gradient={event.gradient}
            description={event.description}
            href={event.wikipediaUrl}
            subtitle={`${event.city} · ${event.dateLabel}`}
            badge={{
              text: event.occurrence.status === "ongoing" ? "Ongoing" : `In ${event.occurrence.daysUntil}d`,
              tone: event.occurrence.status,
            }}
          />
        ))}
      </div>
    </GlassCard>
  );
}
