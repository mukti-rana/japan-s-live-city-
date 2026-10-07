import { CalendarDays } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import EventsGrid from "@/components/home/widgets/EventsGrid";
import { getUpcomingFestivals } from "@/lib/services/events";

export default async function EventsListWidget({
  limit = 5,
  linkToAll = true,
}: {
  limit?: number;
  linkToAll?: boolean;
}) {
  const festivals = await getUpcomingFestivals();

  return (
    <WidgetFrame
      icon={CalendarDays}
      labelKey="widget.festivalsEvents"
      accent="sakura"
      viewAll={linkToAll}
      viewAllHref={linkToAll ? "/events" : undefined}
    >
      <EventsGrid festivals={festivals} limit={limit} />
    </WidgetFrame>
  );
}
