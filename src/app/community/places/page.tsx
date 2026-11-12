import type { Metadata } from "next";
import Link from "next/link";
import { List, Map as MapIcon, MapPin } from "lucide-react";
import AreaPicker from "@/components/community/AreaPicker";
import Bi from "@/components/community/Bi";
import CommunityHero from "@/components/community/CommunityHero";
import CommunityTabs from "@/components/community/CommunityTabs";
import PlaceTypeIcon from "@/components/community/PlaceTypeIcon";
import PlacesExplorer from "@/components/community/PlacesExplorer";
import Unavailable from "@/components/community/Unavailable";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import { PLACE_CATEGORIES } from "@/lib/community/placeTypes";
import { fetchPlaceSummaries, placesFiltersFromParams, type PlacesFilters } from "@/lib/community/placesQuery";
import { publicClient } from "@/lib/community/queries";

const TITLE = "Places — Community — Japan Through People's Eyes";
const DESCRIPTION = "Restaurants, cafes, hotels, shops and sights across Japan, with what visitors say about them.";
export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, alternates: { canonical: "/community/places" }, robots: { index: false, follow: true } };

const chip = (on: boolean) =>
  `inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

const href = (f: PlacesFilters, patch: Partial<PlacesFilters>) => {
  const n = { ...f, ...patch };
  const p = new URLSearchParams();
  if (n.area) p.set("area", n.area);
  if (n.type) p.set("type", n.type);
  if (n.view === "map") p.set("view", "map");
  const q = p.toString();
  return `/community/places${q ? `?${q}` : ""}`;
};

// Every place the community has written about or photographed, in all 47
// prefectures: filter by prefecture and type (restaurants, cafes, hotels, shops…),
// look at them on the map, or sort them by distance from you.
export default async function CommunityPlacesPage({ searchParams }: PageProps<"/community/places">) {
  const f = placesFiltersFromParams(await searchParams);
  const client = publicClient();
  const places = client ? await fetchPlaceSummaries(client, f) : null;
  const area = f.area ? AREA_BY_ID.get(f.area) : undefined;
  // What stays when the prefecture changes.
  const carry = (() => {
    const p = new URLSearchParams();
    if (f.type) p.set("type", f.type);
    if (f.view === "map") p.set("view", "map");
    const q = p.toString();
    return q ? `?${q}` : "";
  })();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <CommunityTabs active="places" />
      <CommunityHero>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <MapPin size={14} aria-hidden="true" />
          <Tx en="Community" />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <Tx en="Explore Japan through its places" />
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/90 sm:text-base">
          <Tx en="Reviews, photos and questions about restaurants, cafes, hotels, shops and sights in all 47 prefectures." />
        </p>
      </CommunityHero>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AreaPicker currentSlug={area?.id} currentLabel={area ? { en: area.en, ja: area.ja } : undefined} query={carry} paramBase="/community/places" />
          <div className="ml-auto flex gap-2" role="group" aria-labelledby="pl-view">
            <span id="pl-view" className="sr-only">
              <Tx en="View" />
            </span>
            <Link href={href(f, { view: "list" })} className={chip(f.view === "list")} aria-current={f.view === "list" ? "page" : undefined}>
              <List size={14} aria-hidden="true" />
              <Tx en="List" />
            </Link>
            <Link href={href(f, { view: "map" })} className={chip(f.view === "map")} aria-current={f.view === "map" ? "page" : undefined}>
              <MapIcon size={14} aria-hidden="true" />
              <Tx en="Map" />
            </Link>
          </div>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-labelledby="pl-type">
          <span id="pl-type" className="sr-only">
            <Tx en="Type of place" />
          </span>
          <Link href={href(f, { type: undefined })} className={chip(!f.type)} aria-current={!f.type ? "page" : undefined}>
            <Tx en="All places" />
          </Link>
          {PLACE_CATEGORIES.map((c) => (
            <Link key={c.id} href={href(f, { type: c.id })} className={chip(f.type === c.id)} aria-current={f.type === c.id ? "page" : undefined}>
              <PlaceTypeIcon category={c.id} size={13} />
              <Bi en={c.en} ja={c.ja} />
            </Link>
          ))}
        </div>
        {(f.area || f.type) && (
          <Link href={href({ view: f.view }, {})} className="w-fit rounded px-1 text-xs font-semibold text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Tx en="Reset filters" />
          </Link>
        )}
      </div>

      {places === null ? (
        <Unavailable reason={client ? "error" : "not_configured"} />
      ) : places.length === 0 ? (
        <div role="status" className="rounded-3xl border border-dashed border-white/20 bg-glass-bg px-5 py-12 text-center">
          <MapPin size={30} aria-hidden="true" className="mx-auto text-lilac" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            <Tx en={f.area || f.type ? "No places match these filters yet" : "No places have been written about yet"} />
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">
            <Tx en="Be the first: share a photo, a review or a question and attach the place." />
          </p>
          <Link href="/community/new" className="mt-5 inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <Tx en="Share your experience" />
          </Link>
        </div>
      ) : (
        <PlacesExplorer places={places} view={f.view} />
      )}
      <p className="text-center text-[11px] text-foreground/60">
        <Tx en="Place data from OpenStreetMap contributors and Wikidata." />
      </p>
    </div>
  );
}
