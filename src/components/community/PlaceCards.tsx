import Link from "next/link";
import { MapPin } from "lucide-react";
import Bi from "@/components/community/Bi";
import Stars from "@/components/community/Stars";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import type { RecommendedPlace } from "@/lib/community/reviewQuery";

// The places reviewers recommend most, as cards. Figures are the real review
// counts; a place missing from the catalogue is simply left out.
export default function PlaceCards({ places }: { places: RecommendedPlace[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {places.map((p) => {
        const place = p.place;
        if (!place) return null;
        const area = AREA_BY_ID.get(place.areaId);
        return (
          <li key={p.placeRef}>
            <Link href={`/community/place/${p.placeRef}`} className="group flex h-full flex-col gap-2 rounded-2xl border border-glass-border bg-panel/70 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure motion-reduce:transition-none">
              <span className="flex items-center gap-1 text-xs text-foreground/80">
                <MapPin size={12} aria-hidden="true" className="shrink-0" />
                {area ? <Bi en={area.en} ja={area.ja} /> : <Tx en="Japan" />}
              </span>
              <span className="text-base font-semibold leading-snug text-foreground">{place.name}</span>
              <span className="flex items-center gap-2 text-xs text-foreground/85">
                <Stars value={p.average} size={14} label={`${p.average.toFixed(1)} / 5`} />
                <span className="tabular-nums">{p.average.toFixed(1)}</span>
              </span>
              <span className="text-xs font-medium text-mint">
                {p.recommends} <Tx en={p.recommends === 1 ? "reviewer recommends it" : "reviewers recommend it"} />
                <span className="text-foreground/70"> · {p.reviews} <Tx en={p.reviews === 1 ? "review" : "reviews"} /></span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
