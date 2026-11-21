import { isAreaId } from "@/lib/community/areas";
import { isListingCategory } from "@/lib/community/listings/categories";
import { LISTING_KINDS, type ListingKind } from "@/lib/community/listings/types";

// What a visitor can narrow What's Happening by. Parsed from the address, so every value is checked here and anything unexpected falls
// back to a safe default; every view has its own shareable address.

export type ListingWhen = "all" | "now" | "upcoming" | "new" | "popular";
export const LISTING_WHENS: ListingWhen[] = ["all", "now", "upcoming", "new", "popular"];
export type ListingPrice = "any" | "free" | "paid";
export const LISTING_PAGE_SIZE = 12;

export interface ListingFilters {
  kinds: ListingKind[];
  category: string;
  area: string;
  q: string;
  when: ListingWhen;
  price: ListingPrice;
  date: string;
  featured: boolean;
  page: number;
}

export const DEFAULT_LISTING_FILTERS: ListingFilters = { kinds: [], category: "", area: "", q: "", when: "all", price: "any", date: "", featured: false, page: 1 };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function listingFiltersFromParams(sp: Record<string, string | string[] | undefined>, base: Partial<ListingFilters> = {}): ListingFilters {
  const f = { ...DEFAULT_LISTING_FILTERS, ...base };
  const category = first(sp.category);
  const area = first(sp.area);
  const when = first(sp.when) as ListingWhen;
  const price = first(sp.price) as ListingPrice;
  const date = first(sp.date);
  const page = Number(first(sp.page));
  const kind = first(sp.kind) as ListingKind;
  return {
    ...f,
    kinds: LISTING_KINDS.includes(kind) ? [kind] : f.kinds,
    category: isListingCategory(category) ? category : "",
    area: isAreaId(area) ? area : "",
    q: first(sp.q).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80),
    when: LISTING_WHENS.includes(when) ? when : f.when,
    price: price === "free" || price === "paid" ? price : "any",
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    page: Number.isInteger(page) && page >= 1 && page <= 200 ? page : 1,
  };
}

// The address of a view (defaults left out), for links and the pager.
export function listingQuery(f: ListingFilters, patch: Partial<ListingFilters> = {}): string {
  const n = { ...f, ...patch };
  const p = new URLSearchParams();
  if (n.category) p.set("category", n.category);
  if (n.area) p.set("area", n.area);
  if (n.q) p.set("q", n.q);
  if (n.when !== "all") p.set("when", n.when);
  if (n.price !== "any") p.set("price", n.price);
  if (n.date) p.set("date", n.date);
  if (n.page > 1) p.set("page", String(n.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}
