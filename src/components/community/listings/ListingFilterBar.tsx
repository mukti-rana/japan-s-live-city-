import Link from "next/link";
import { Search, X } from "lucide-react";
import Bi from "@/components/community/Bi";
import Tx from "@/components/i18n/Tx";
import { AREAS, AREA_BY_ID } from "@/lib/community/areas";
import { LISTING_CATEGORIES, LISTING_CATEGORY_BY_SLUG } from "@/lib/community/listings/categories";
import { listingQuery, type ListingFilters, type ListingWhen } from "@/lib/community/listings/filters";

const WHEN_LABEL: Record<ListingWhen, string> = { all: "Coming up", now: "Happening now", upcoming: "Coming up", new: "Newly published", popular: "Popular" };
const field = "h-10 w-full rounded-full border border-white/20 bg-transparent px-3.5 text-sm text-white outline-none transition-colors hover:border-white/40 focus:border-white/60 focus-visible:ring-2 focus-visible:ring-white/40 [&>option]:bg-[#0b0b0c] [&>option]:text-white";
const label = "flex min-w-0 flex-col gap-1 text-[11px] font-medium text-white/60";

// The filters of a browse page: a plain GET form (so every choice is a shareable address and it works without scripts), tucked behind a small "Filters"
// button, and the choices made shown as removable chips.
export default function ListingFilterBar({ basePath, filters, extra = {} }: { basePath: string; filters: ListingFilters; extra?: Record<string, string> }) {
  const chips: { key: string; node: React.ReactNode; href: string }[] = [];
  const area = filters.area ? AREA_BY_ID.get(filters.area) : null;
  const cat = filters.category ? LISTING_CATEGORY_BY_SLUG.get(filters.category) : null;
  const href = (patch: Partial<ListingFilters>) => `${basePath}${listingQuery(filters, { page: 1, ...patch })}${Object.keys(extra).length ? `${listingQuery(filters, { page: 1, ...patch }) ? "&" : "?"}${new URLSearchParams(extra)}` : ""}`;
  if (filters.q) chips.push({ key: "q", node: <>“{filters.q}”</>, href: href({ q: "" }) });
  if (area) chips.push({ key: "area", node: <Bi en={area.en} ja={area.ja} />, href: href({ area: "" }) });
  if (cat) chips.push({ key: "category", node: <Bi en={cat.en} ja={cat.ja} />, href: href({ category: "" }) });
  if (filters.price !== "any") chips.push({ key: "price", node: <Tx en={filters.price === "free" ? "Free" : "Paid"} />, href: href({ price: "any" }) });
  if (filters.date) chips.push({ key: "date", node: <>{filters.date}</>, href: href({ date: "" }) });
  if (filters.when !== "all") chips.push({ key: "when", node: <Tx en={WHEN_LABEL[filters.when]} />, href: href({ when: "all" }) });

  return (
    <div className="flex flex-col gap-3">
      <details className="group/f rounded-2xl border border-white/10 bg-transparent" open={chips.length > 0}>
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Search size={14} aria-hidden="true" />
            <Tx en="Search and filters" />
            {chips.length > 0 && <span className="rounded-full border border-white/25 px-2 text-xs">{chips.length}</span>}
          </span>
          <span aria-hidden="true" className="text-white/50 transition-transform group-open/f:rotate-180">⌄</span>
        </summary>
        <form action={basePath} method="get" className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(extra).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label className={`${label} sm:col-span-2 lg:col-span-3`}>
            <Tx en="Search" />
            <input type="search" name="q" defaultValue={filters.q} maxLength={80} placeholder="…" className={`${field} placeholder:text-white/40`} />
          </label>
          <label className={label}>
            <Tx en="Prefecture" />
            <select name="area" defaultValue={filters.area} className={field}>
              <option value="">…</option>
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  <Bi en={a.en} ja={a.ja} />
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            <Tx en="Category" />
            <select name="category" defaultValue={filters.category} className={field}>
              <option value="">…</option>
              {LISTING_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  <Bi en={c.en} ja={c.ja} />
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            <Tx en="Entry" />
            <select name="price" defaultValue={filters.price} className={field}>
              <option value="any">
                <Tx en="Any" />
              </option>
              <option value="free">
                <Tx en="Free" />
              </option>
              <option value="paid">
                <Tx en="Paid" />
              </option>
            </select>
          </label>
          <label className={label}>
            <Tx en="Show" />
            <select name="when" defaultValue={filters.when} className={field}>
              {(["all", "now", "new", "popular"] as ListingWhen[]).map((w) => (
                <option key={w} value={w}>
                  <Tx en={WHEN_LABEL[w]} />
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            <Tx en="On a day" />
            <input type="date" name="date" defaultValue={filters.date} className={field} />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-10 rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              <Tx en="Apply" />
            </button>
            {chips.length > 0 && (
              <Link href={basePath + (Object.keys(extra).length ? `?${new URLSearchParams(extra)}` : "")} className="inline-flex h-10 items-center rounded-full px-3 text-sm text-white/65 underline-offset-4 hover:text-white hover:underline">
                <Tx en="Clear filters" />
              </Link>
            )}
          </div>
        </form>
      </details>
      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.key}>
              <Link href={c.href} className="inline-flex items-center gap-1 rounded-full border border-white/25 px-3 py-1 text-xs font-medium text-white hover:border-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                {c.node}
                <X size={11} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
