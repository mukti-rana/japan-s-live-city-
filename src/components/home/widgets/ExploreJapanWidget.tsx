import { Compass } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import ExploreJapanGrid from "@/components/home/widgets/ExploreJapanGrid";
import { getPopularPlaces } from "@/lib/services/places";

export default async function ExploreJapanWidget() {
  const places = await getPopularPlaces();

  return (
    <WidgetFrame icon={Compass} labelKey="widget.exploreJapan" accent="gold">
      <ExploreJapanGrid places={places} />
    </WidgetFrame>
  );
}
