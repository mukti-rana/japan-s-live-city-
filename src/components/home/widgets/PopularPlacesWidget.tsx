import { Landmark } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import PopularPlacesGrid from "@/components/home/widgets/PopularPlacesGrid";
import { getPopularPlaces } from "@/lib/services/places";

export default async function PopularPlacesWidget() {
  const places = await getPopularPlaces();

  return (
    <WidgetFrame icon={Landmark} labelKey="widget.popularPlaces" accent="gold">
      <PopularPlacesGrid places={places} />
    </WidgetFrame>
  );
}
