import Link from "next/link";
import { Compass, ExternalLink, MapPin, Navigation } from "lucide-react";
import Bi from "@/components/community/Bi";
import PlaceTypeIcon from "@/components/community/PlaceTypeIcon";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import { PLACE_CATEGORY_BY_ID, googleDirectionsUrl, googleMapsUrl, osmEmbedUrl, osmLargerUrl, type CommunityPlace } from "@/lib/community/placeTypes";

const btn = "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

// A place's name, address, a small map and the two links people want: open it in
// Google Maps, and get directions there. The links need no key. Coordinates come
// from the place itself (OpenStreetMap or the Explore catalogue) and are never a
// person's own position.
export default function PlaceInfo({ place, compact = false, link = true }: { place: CommunityPlace; compact?: boolean; link?: boolean }) {
  const area = AREA_BY_ID.get(place.areaId);
  const category = PLACE_CATEGORY_BY_ID.get(place.category);
  const name = <span className="break-words">{place.name}</span>;

  return (
    <section aria-label="Location" className="overflow-hidden rounded-3xl border border-glass-border bg-panel/60 backdrop-blur-xl">
      <div className={compact ? "grid gap-0 sm:grid-cols-[1fr_minmax(0,16rem)]" : "grid gap-0 md:grid-cols-[1fr_minmax(0,22rem)]"}>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-azure/15 text-azure">
              <PlaceTypeIcon category={place.category} size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-snug text-foreground">
                {link ? (
                  <Link href={`/community/place/${place.ref}`} className="rounded underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </p>
              {place.nameJa && place.nameJa !== place.name && <p className="text-xs text-foreground/75">{place.nameJa}</p>}
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/80">
                {category && (
                  <span className="rounded-full border border-lilac/40 bg-lilac/10 px-2 py-0.5 font-medium text-lilac">
                    <Bi en={category.en} ja={category.ja} />
                  </span>
                )}
                {area && (
                  <Link href={`/community/${area.id}`} className="inline-flex items-center gap-1 rounded underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                    <MapPin size={11} aria-hidden="true" />
                    <Bi en={area.en} ja={area.ja} />
                  </Link>
                )}
              </p>
            </div>
          </div>
          {(place.address || place.city) && <p className="break-words text-sm text-foreground/90">{place.address ?? place.city}</p>}
          <div className="flex flex-wrap gap-2">
            <a href={googleMapsUrl(place)} target="_blank" rel="noopener noreferrer" className={`${btn} border-azure/50 bg-azure/15 text-azure hover:bg-azure/25`}>
              <ExternalLink size={15} aria-hidden="true" />
              <Tx en="View on Google Maps" />
            </a>
            <a href={googleDirectionsUrl(place)} target="_blank" rel="noopener noreferrer" className={`${btn} border-glass-border bg-glass-bg text-foreground hover:border-white/30`}>
              <Navigation size={15} aria-hidden="true" />
              <Tx en="Get Directions" />
            </a>
            {place.source === "catalogue" && link && (
              <Link href={`/explore/${place.ref}`} className={`${btn} border-glass-border bg-glass-bg text-foreground hover:border-white/30`}>
                <Compass size={15} aria-hidden="true" />
                <Tx en="Place details and map" />
              </Link>
            )}
          </div>
        </div>
        <div className="relative min-h-44 border-t border-glass-border bg-black/20 sm:min-h-full md:border-l md:border-t-0">
          <iframe title="Map" src={osmEmbedUrl(place)} loading="lazy" className="absolute inset-0 h-full w-full border-0" />
          <a href={osmLargerUrl(place)} target="_blank" rel="noopener noreferrer" className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Tx en="© OpenStreetMap contributors" />
          </a>
        </div>
      </div>
    </section>
  );
}
