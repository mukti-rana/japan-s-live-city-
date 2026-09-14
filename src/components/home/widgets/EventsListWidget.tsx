import { CalendarDays, Users } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import Tabs from "@/components/ui/Tabs";
import Thumb from "@/components/ui/Thumb";
import { mockTodaysEvents, mockEventTabs } from "@/lib/mock/dashboard";

export default function EventsListWidget() {
  return (
    <WidgetFrame icon={CalendarDays} label="Today's Events" accent="sakura" viewAll>
      <Tabs tabs={mockEventTabs} />

      <ul className="flex flex-col">
        {mockTodaysEvents.map((event) => (
          <li
            key={event.name}
            className="flex gap-3 border-b border-glass-border py-2.5 last:border-0"
          >
            <Thumb
              gradient={event.gradient}
              icon={CalendarDays}
              src={event.image}
              alt={event.name}
              className="h-14 w-16"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-foreground">
                  {event.name}
                </p>
                <span className="shrink-0 rounded-md bg-sakura/15 px-1.5 py-0.5 text-[9px] font-medium text-sakura">
                  Today
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted">
                {event.city} <span className="text-glass-border">|</span>{" "}
                {event.time}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                <Users size={10} />
                {event.attendees}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}
