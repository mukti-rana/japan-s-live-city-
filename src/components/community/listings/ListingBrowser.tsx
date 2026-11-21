import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List, Map as MapIcon } from "lucide-react";
import ListingCard from "@/components/community/listings/ListingCard";
import ListingFilterBar from "@/components/community/listings/ListingFilterBar";
import ListingsMapView from "@/components/community/listings/ListingsMapView";
import Unavailable from "@/components/community/Unavailable";
import Tx from "@/components/i18n/Tx";
import { listingQuery, type ListingFilters } from "@/lib/community/listings/filters";
import { fetchListingsFor } from "@/lib/community/listings/queries";
import { nowMs } from "@/lib/community/listings/time";
import type { ListingKind } from "@/lib/community/listings/types";

const pager = "inline-flex h-11 items-center gap-1.5 rounded-full border border-white/20 px-4 text-sm font-medium text-white transition-colors hover:border-white/45 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";
const seg = (on: boolean) => `inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${on ? "bg-white/12 text-white" : "text-white/65 hover:text-white"}`;

// The results of a browse page (Events, Announcements): the filter bar, a List / Map switch, the cards and the pager. Everything is read from the
// address, so every view can be shared and works without scripts (the map needs them).
export default async function ListingBrowser({ basePath, kinds, filters, view, emptyTitle, emptyHelp }: { basePath: string; kinds: ListingKind[]; filters: ListingFilters; view: "list" | "map"; emptyTitle: string; emptyHelp: string }) {
  const now = nowMs();
  const f = { ...filters, kinds };
  const qs = listingQuery(f).replace(/^\?/, "");
  const kindParam = kinds.join(",");
  const mapQuery = `?${qs ? `${qs}&` : ""}kinds=${kindParam}`;
  const link = (patch: Partial<ListingFilters>, v: "list" | "map" = view) => `${basePath}${listingQuery(f, patch)}${v === "map" ? `${listingQuery(f, patch) ? "&" : "?"}view=map` : ""}`;
  const res = view === "list" ? await fetchListingsFor(f) : null;

  return (
    <div className="flex flex-col gap-5">
      <ListingFilterBar basePath={basePath} filters={f} extra={view === "map" ? { view: "map" } : {}} />
      <div className="flex items-center justify-between gap-3">
        <div role="group" aria-label="View" className="inline-flex rounded-full border border-white/15 p-1">
          <Link href={link({}, "list")} aria-current={view === "list" ? "page" : undefined} className={seg(view === "list")}>
            <List size={14} aria-hidden="true" />
            <Tx en="List" />
          </Link>
          <Link href={link({}, "map")} aria-current={view === "map" ? "page" : undefined} className={seg(view === "map")}>
            <MapIcon size={14} aria-hidden="true" />
            <Tx en="Map" />
          </Link>
        </div>
      </div>

      {view === "map" ? (
        <ListingsMapView query={mapQuery} now={now} />
      ) : res && res.state === "unavailable" ? (
        <Unavailable reason={res.reason} />
      ) : res && res.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[26px] border border-dashed border-white/20 px-5 py-14 text-center">
          <CalendarDays size={28} aria-hidden="true" className="text-white/55" />
          <h2 className="text-xl font-semibold text-foreground">
            <Tx en={emptyTitle} />
          </h2>
          <p className="max-w-md text-sm text-white/65">
            <Tx en={emptyHelp} />
          </p>
          <Link href="/community/create" className="mt-2 inline-flex h-11 items-center rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <Tx en="Create" />
          </Link>
        </div>
      ) : res ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {res.items.map((l, i) => (
              <li key={l.id} className="cm-rise">
                <ListingCard l={l} now={now} priority={i < 3} />
              </li>
            ))}
          </ul>
          {(filters.page > 1 || res.hasMore) && (
            <div className="flex items-center justify-between gap-3">
              {filters.page > 1 ? (
                <Link href={link({ page: filters.page - 1 })} rel="prev" className={pager}>
                  <ChevronLeft size={16} aria-hidden="true" />
                  <Tx en="Previous" />
                </Link>
              ) : (
                <span />
              )}
              {res.hasMore && (
                <Link href={link({ page: filters.page + 1 })} rel="next" className={pager}>
                  <Tx en="Next" />
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
