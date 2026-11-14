"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Check, ChevronDown, Hash, MapPin, Map as MapIcon, Search, SlidersHorizontal, Store, X } from "lucide-react";
import Bi from "@/components/community/Bi";
import PlaceTypeIcon from "@/components/community/PlaceTypeIcon";
import type { PlaceCategory } from "@/lib/community/placeTypes";
import { useTranslate } from "@/lib/i18n/inline";

export interface FilterOption {
  value: string;
  en: string;
  ja: string;
  // A heading to list it under (the location list is grouped by region).
  group?: string;
  groupJa?: string;
  // Extra words that should find it when searching (a prefecture's cities).
  hint?: string;
  icon?: PlaceCategory;
}

export interface FilterFacet {
  id: string;
  // English label; translated here.
  label: string;
  icon: "location" | "region" | "topic" | "type" | "sort";
  // The query-string key this filter lives in.
  param: string;
  // "multi": any number of values (OR). "single": exactly one or none.
  mode: "single" | "multi";
  options: FilterOption[];
  selected: string[];
  // Single mode: the text of the "no filter" choice ("All Japan").
  allLabel?: string;
  // The value that is the page's default and is left out of the address (sort).
  defaultValue?: string;
  // Choosing a value opens `${pathBase}/${value}` instead of setting a query value
  // (the city pages on Discover).
  pathBase?: string;
  searchable?: boolean;
  // Dropped from the address when a place is chosen from a path-based Location
  // filter (a region means nothing once you are on one place's page).
  ignoredWithPlace?: boolean;
  // false for Sort: it orders the results, it does not narrow them.
  narrows?: boolean;
}

const ICONS = { location: MapPin, region: MapIcon, topic: Hash, type: Store, sort: ArrowUpDown } as const;

// One filter button instead of rows of options: a sliders icon (with the number
// of active filters) opens every filter in one panel — a popover on desktop, a
// bottom sheet on a phone. Chosen filters then show as small removable chips
// with "Clear all". Every choice ends up in the address bar (the same query
// values the page already understood), so results can be shared.
//
// `lead` and `trail` let a page put its own search box and buttons in the same
// row as the filter button; `children` follow the filter button.
export default function FilterToolbar({ path, facets, extra = {}, q, qIsFilter = true, clearHref, lead, trail, children }: { path: string; facets: FilterFacet[]; extra?: Record<string, string>; q?: string; qIsFilter?: boolean; clearHref: string; lead?: ReactNode; trail?: ReactNode; children?: ReactNode }) {
  const tr = useTranslate();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const bar = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const current = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const f of facets) out[f.id] = f.selected;
    return out;
  }, [facets]);

  const build = (sel: Record<string, string[]>, withQ = true): string => {
    let pathname = path;
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    if (q && withQ) p.set("q", q);
    const placed = facets.some((f) => f.pathBase !== undefined && (sel[f.id] ?? []).length > 0);
    for (const f of facets) {
      const vals = sel[f.id] ?? [];
      if (f.pathBase !== undefined) {
        pathname = vals[0] ? `${f.pathBase}/${vals[0]}` : f.pathBase;
        continue;
      }
      if (placed && f.ignoredWithPlace) continue;
      if (vals.length === 0 || (f.defaultValue !== undefined && vals.join(",") === f.defaultValue)) continue;
      p.set(f.param, vals.join(","));
    }
    // Commas stay readable in the address (?category=food,nature).
    const s = p.toString().replace(/%2C/gi, ",");
    return s ? `${pathname}?${s}` : pathname;
  };

  const optionOf = (f: FilterFacet, v: string) => f.options.find((o) => o.value === v);
  const narrowing = facets.filter((f) => f.narrows !== false);
  const activeCount = narrowing.reduce((n, f) => n + f.selected.length, 0) + (q && qIsFilter ? 1 : 0);

  // Close on an outside click (desktop popover) or Escape; the phone sheet also
  // stops the page behind it from scrolling.
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (window.matchMedia("(min-width: 768px)").matches && bar.current && !bar.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    if (!window.matchMedia("(min-width: 768px)").matches) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const toggle = (f: FilterFacet, list: string[], v: string): string[] => (f.mode === "single" ? (list[0] === v ? [] : [v]) : list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const apply = (sel: Record<string, string[]>) => {
    setOpen(false);
    router.push(build(sel));
  };

  const chips: { key: string; label: ReactNode; href: string; remove: string }[] = [];
  for (const f of narrowing) {
    for (const v of f.selected) {
      const o = optionOf(f, v);
      if (!o) continue;
      chips.push({ key: `${f.id}:${v}`, label: <Bi en={o.en} ja={o.ja} />, remove: o.en, href: build({ ...current, [f.id]: f.selected.filter((x) => x !== v) }) });
    }
  }
  if (q && qIsFilter) chips.push({ key: "q", label: <>“{q}”</>, remove: q, href: build(current, false) });

  return (
    <div ref={bar} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
        {lead}
        <div className="relative order-4 shrink-0">
          <button
            ref={trigger}
            type="button"
            onClick={() => {
              if (!open) {
                setDraft(current);
                setSection(null);
              }
              setOpen((o) => !o);
            }}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={activeCount > 0 ? `${tr("Filters")} (${activeCount})` : tr("Filters")}
            title={tr("Filters")}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${open || activeCount > 0 ? "border-white/30 bg-white/10 text-white" : "border-glass-border bg-glass-bg text-foreground/80 hover:border-white/25 hover:text-white"}`}
          >
            <SlidersHorizontal size={17} aria-hidden="true" className={activeCount > 0 ? "text-azure" : ""} />
            {activeCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-azure px-1 text-[10px] font-bold text-black">{activeCount}</span>}
          </button>

          {open && (
            <div className="fixed inset-0 z-[60] md:static md:inset-auto md:z-auto">
              <div className="cm-fade absolute inset-0 bg-black/70 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={tr("Filters")}
                className="cm-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-white/12 bg-cm-pop md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:z-40 md:mt-2 md:max-h-[min(78vh,640px)] md:w-[420px] md:rounded-2xl md:border md:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)]"
              >
                <div className="flex items-center justify-between px-5 pb-2 pt-4 md:pt-3">
                  <h2 className="text-lg font-semibold text-white md:text-base">{tr("Filters")}</h2>
                  <button type="button" onClick={() => setOpen(false)} aria-label={tr("Close")} className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure md:h-8 md:w-8">
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3">
                  {facets.map((f) => {
                    const Icon = ICONS[f.icon];
                    const sel = draft[f.id] ?? [];
                    const isOpen = section === f.id;
                    const chosen = sel.map((v) => optionOf(f, v)).filter((o): o is FilterOption => Boolean(o));
                    return (
                      <div key={f.id} className="border-b border-white/8 last:border-0">
                        <button type="button" onClick={() => setSection(isOpen ? null : f.id)} aria-expanded={isOpen} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                          <Icon size={18} aria-hidden="true" className="shrink-0 text-foreground/65" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-base font-medium text-white md:text-sm">{tr(f.label)}</span>
                            <span className="block truncate text-sm text-foreground/65 md:text-xs">
                              {chosen.length === 0
                                ? f.allLabel
                                  ? tr(f.allLabel)
                                  : tr("Any")
                                : chosen.map((o, i) => (
                                    <span key={o.value}>
                                      {i > 0 && ", "}
                                      <Bi en={o.en} ja={o.ja} />
                                    </span>
                                  ))}
                            </span>
                          </span>
                          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-foreground/55 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOpen && (
                          <div className="px-1 pb-4">
                            <OptionList facet={f} value={sel} onToggle={(v) => setDraft((d) => ({ ...d, [f.id]: toggle(f, d[f.id] ?? [], v) }))} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 border-t border-white/10 bg-cm-pop-foot p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-b-2xl md:p-3">
                  <button
                    type="button"
                    onClick={() => {
                      const cleared: Record<string, string[]> = {};
                      for (const f of facets) cleared[f.id] = f.narrows === false ? (draft[f.id] ?? []) : [];
                      setDraft(cleared);
                    }}
                    className="h-12 rounded-xl border border-white/15 px-5 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure md:h-10"
                  >
                    {tr("Clear all")}
                  </button>
                  <button type="button" onClick={() => apply(draft)} className="h-12 flex-1 rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure md:h-10">
                    {tr("Show results")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {children}
        {trail}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={tr("Selected filters")}>
          <span className="text-xs font-medium text-foreground/70" aria-live="polite">
            {activeCount} {tr(activeCount === 1 ? "active filter" : "active filters")}
          </span>
          {chips.map((c) => (
            <Link key={c.key} href={c.href} aria-label={`${tr("Remove")} ${c.remove}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-azure/40 bg-azure/10 pl-3 pr-2 text-xs font-medium text-azure transition-colors hover:bg-azure/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              {c.label}
              <X size={12} aria-hidden="true" />
            </Link>
          ))}
          <Link href={clearHref} className="inline-flex h-8 items-center rounded-full px-2.5 text-xs font-medium text-foreground/75 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {tr("Clear all")}
          </Link>
        </div>
      )}
    </div>
  );
}

// The options of one filter. Many-choice filters are check chips; one-choice
// filters are a list (searchable and grouped for the location list).
function OptionList({ facet, value, onToggle, hrefFor, onNavigate }: { facet: FilterFacet; value: string[]; onToggle: (v: string) => void; hrefFor?: (v: string | null) => string; onNavigate?: () => void }) {
  const tr = useTranslate();
  const [text, setText] = useState("");
  const needle = text.trim().toLowerCase();
  const shown = needle ? facet.options.filter((o) => `${o.en} ${o.ja} ${o.hint ?? ""}`.toLowerCase().includes(needle)) : facet.options;

  if (facet.mode === "multi") {
    return (
      <div className="flex flex-wrap gap-2" role="group" aria-label={tr(facet.label)}>
        {facet.options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button key={o.value} type="button" onClick={() => onToggle(o.value)} aria-pressed={on} className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-azure/60 bg-azure/15 text-white" : "border-white/12 bg-white/[0.03] text-foreground/85 hover:border-white/30 hover:text-white"}`}>
              {o.icon && <PlaceTypeIcon category={o.icon} size={13} />}
              <Bi en={o.en} ja={o.ja} />
              {on && <Check size={13} aria-hidden="true" className="text-azure" />}
            </button>
          );
        })}
      </div>
    );
  }

  const groups: { name: string | undefined; ja: string | undefined; items: FilterOption[] }[] = [];
  for (const o of shown) {
    const g = groups.find((x) => x.name === o.group);
    if (g) g.items.push(o);
    else groups.push({ name: o.group, ja: o.groupJa, items: [o] });
  }
  const row = (on: boolean) => `flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "bg-white/10 text-white" : "text-foreground/85 hover:bg-white/[0.06] hover:text-white"}`;
  const item = (key: string, on: boolean, v: string | null, label: ReactNode) =>
    hrefFor ? (
      <Link key={key} href={hrefFor(v)} onClick={onNavigate} aria-current={on ? "true" : undefined} className={row(on)}>
        {label}
        {on && <Check size={15} aria-hidden="true" className="shrink-0 text-azure" />}
      </Link>
    ) : (
      <button key={key} type="button" onClick={() => onToggle(v ?? "")} aria-pressed={on} className={row(on)}>
        {label}
        {on && <Check size={15} aria-hidden="true" className="shrink-0 text-azure" />}
      </button>
    );

  return (
    <div className="flex flex-col gap-2">
      {facet.searchable && (
        <label className="relative block">
          <span className="sr-only">{tr("Search locations")}</span>
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/55" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("Search locations")} className="h-11 w-full rounded-xl border border-white/12 bg-black/40 pl-9 pr-3 text-base text-white outline-none placeholder:text-foreground/50 focus:border-azure/60 sm:text-sm" />
        </label>
      )}
      <div role="group" aria-label={tr(facet.label)} className="flex flex-col">
        {facet.allLabel && !needle && (hrefFor ? item("all", value.length === 0, null, <span>{tr(facet.allLabel)}</span>) : (
          <button type="button" onClick={() => value[0] && onToggle(value[0])} aria-pressed={value.length === 0} className={row(value.length === 0)}>
            <span>{tr(facet.allLabel)}</span>
            {value.length === 0 && <Check size={15} aria-hidden="true" className="shrink-0 text-azure" />}
          </button>
        ))}
        {groups.map((g) => (
          <div key={g.name ?? "_"} className="flex flex-col">
            {g.name && (
              <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
                {g.ja ? <Bi en={g.name} ja={g.ja} /> : tr(g.name)}
              </p>
            )}
            {g.items.map((o) => item(`${g.name}-${o.value}`, value.includes(o.value), o.value, <Bi en={o.en} ja={o.ja} />))}
          </div>
        ))}
        {shown.length === 0 && <p className="px-3 py-4 text-sm text-foreground/70">{tr("No match")}</p>}
      </div>
    </div>
  );
}
