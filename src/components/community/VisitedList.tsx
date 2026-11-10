import Link from "next/link";
import { MapPin } from "lucide-react";
import Bi from "@/components/community/Bi";
import LocalDate from "@/components/community/LocalDate";
import RemoveVisitedButton from "@/components/community/RemoveVisitedButton";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import { getDestination } from "@/lib/explore/catalogue";
import type { VisitedPlace } from "@/lib/community/types";

// "Been here": the places a person marked as visited, newest first, with how
// many areas of Japan that covers. Only the owner can remove entries.
export default function VisitedList({ places, owner }: { places: VisitedPlace[]; owner: boolean }) {
  if (places.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/20 bg-glass-bg px-4 py-8 text-center text-sm text-foreground/85">
        <Tx en={owner ? "You haven't marked any places yet. Open a place and tap “Been here”." : "No places to show yet."} />
      </p>
    );
  }
  const areas = new Set(places.map((p) => p.areaId));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/90">
        {places.length} <Tx en={places.length === 1 ? "place" : "places"} /> · {areas.size} <Tx en={areas.size === 1 ? "area of Japan" : "areas of Japan"} />
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((v) => {
          const place = getDestination(v.placeRef);
          const area = AREA_BY_ID.get(v.areaId);
          const name = place ? place.names.en ?? place.names.ja ?? v.placeRef : v.placeRef;
          return (
            <li key={v.placeRef} className="flex items-center gap-2 rounded-2xl border border-glass-border bg-panel/60 p-3 pl-4">
              <MapPin size={16} aria-hidden="true" className="shrink-0 text-lilac" />
              <div className="min-w-0 flex-1">
                <Link href={`/community/place/${v.placeRef}`} className="block truncate text-sm font-medium text-foreground underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  {name}
                </Link>
                <p className="truncate text-xs text-foreground/75">
                  {area && <Bi en={area.en} ja={area.ja} />} · <LocalDate iso={v.visitedAt} />
                </p>
              </div>
              {owner && <RemoveVisitedButton placeRef={v.placeRef} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
