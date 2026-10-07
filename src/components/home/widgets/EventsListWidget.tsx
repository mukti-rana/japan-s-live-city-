import { CalendarDays } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import EventsGrid from "@/components/home/widgets/EventsGrid";
import { getUpcomingFestivals } from "@/lib/services/events";

export default async function EventsListWidget({
  limit = 5,
  linkToAll = true,
  columns = 1,
}: {
  limit?: number;
  linkToAll?: boolean;
  columns?: 1 | 2;
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
      <EventsGrid festivals={festivals} limit={limit} columns={columns} />
    </WidgetFrame>
  );
}
