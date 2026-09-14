import { Landmark, Users } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import Tabs from "@/components/ui/Tabs";
import Thumb from "@/components/ui/Thumb";
import { mockPopularPlaces, mockPlaceTabs } from "@/lib/mock/dashboard";

export default function PopularPlacesWidget() {
  return (
    <WidgetFrame icon={Landmark} label="Popular Places" accent="gold" viewAll>
      <Tabs tabs={mockPlaceTabs} />

      <div className="grid grid-cols-3 gap-2">
        {mockPopularPlaces.map((place) => (
          <div key={place.name} className="min-w-0">
            <Thumb
              gradient={place.gradient}
              icon={Landmark}
              src={place.image}
              alt={place.name}
              className="h-20 w-full"
            />
            <p className="mt-1.5 truncate text-[11px] font-medium text-foreground">
              {place.name}
            </p>
            <p className="text-[10px] text-muted">{place.city}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="rounded-md bg-mint/15 px-1.5 py-0.5 text-[9px] font-medium text-mint">
                {place.status}
              </span>
              <span className="flex items-center gap-0.5 text-[9px] text-muted">
                <Users size={9} />
                {place.visitors}
              </span>
            </div>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
