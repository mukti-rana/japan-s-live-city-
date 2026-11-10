"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { AREAS, FEATURED_AREAS } from "@/lib/community/areas";
import { REGIONS } from "@/lib/explore/regions";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { known } from "@/lib/i18n/translate";
import { useTranslate } from "@/lib/i18n/inline";

interface Option {
  key: string;
  href: string;
  en: string;
  ja: string;
  // Extra words that should find this option (its prefecture, its cities).
  hint: string;
  group: string;
  selected: boolean;
}

// A searchable list of every prefecture and the best-known cities. Choosing one
// is plain navigation (each option is a link), so every result has its own
// shareable address. `query` is the query string to carry over (topic, search,
// sort); the page number and region always start over.
// By default a city opens its own page (/community/<city>). With `paramBase`, the
// city is instead passed as ?area=<prefecture> to that page (used by Photos).
export default function AreaPicker({ currentSlug, currentLabel, query, paramBase }: { currentSlug?: string; currentLabel?: { en: string; ja: string }; query: string; paramBase?: string }) {
  const hrefFor = (slug: string, areaId: string) => {
    if (!paramBase) return `/community/${slug}${query}`;
    const p = new URLSearchParams(query.replace(/^\?/, ""));
    p.set("area", areaId);
    return `${paramBase}?${p.toString()}`;
  };
  const allHref = paramBase ? `${paramBase}${query}` : `/community${query}`;
  const tr = useTranslate();
  const { language } = useLanguage();
  const name = (o: { en: string; ja: string }) => (language === "ja" ? o.ja : known(o.en, language));
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const options = useMemo<Option[]>(() => {
    const out: Option[] = [];
    for (const f of FEATURED_AREAS) {
      const area = AREAS.find((a) => a.id === f.areaId);
      out.push({ key: `c-${f.slug}`, href: hrefFor(f.slug, f.areaId), en: f.en, ja: f.ja, hint: `${area?.en ?? ""} ${area?.ja ?? ""}`, group: "Popular places", selected: currentSlug === f.slug });
    }
    for (const r of REGIONS) {
      for (const id of r.prefectureIds) {
        const a = AREAS.find((x) => x.id === id);
        if (!a) continue;
        out.push({ key: `p-${id}`, href: hrefFor(id, id), en: a.en, ja: a.ja, hint: a.cities.join(" "), group: r.id, selected: currentSlug === id });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentSlug, paramBase]);

  const needle = text.trim().toLowerCase();
  const shown = options.filter((o) => {
    if (region && o.group !== region) return false;
    if (!needle) return true;
    return `${o.en} ${o.ja} ${o.hint}`.toLowerCase().includes(needle);
  });
  const groups = [...new Set(shown.map((o) => o.group))];

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const label = currentLabel ? name(currentLabel) : tr("All Japan");
  const groupName = (g: string) => (g === "Popular places" ? tr("Popular places") : (REGIONS.find((r) => r.id === g) ? name(REGIONS.find((r) => r.id === g)!) : g));

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        className={`inline-flex h-11 max-w-full items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${currentLabel ? "border-azure/60 bg-azure/15 text-azure" : "border-glass-border bg-glass-bg text-foreground hover:border-white/30"}`}
      >
        <MapPin size={15} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown size={15} aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id={listId} className="absolute left-0 z-30 mt-2 w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-glass-border bg-[rgba(14,19,36,0.97)] shadow-2xl backdrop-blur-xl">
          <div className="border-b border-glass-border p-3">
            <label className="relative block">
              <span className="sr-only">{tr("Search cities and prefectures")}</span>
              <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60" />
              <input
                ref={input}
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={tr("Search cities and prefectures")}
                className="h-11 w-full rounded-xl border border-glass-border bg-black/30 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden text-base text-foreground outline-none placeholder:text-foreground/55 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm"
              />
              {text && (
                <button type="button" onClick={() => { setText(""); input.current?.focus(); }} aria-label={tr("Clear search")} className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </label>
            <div className="-mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={tr("Region")}>
              {[{ id: null as string | null, en: "All regions", ja: "全国" }, ...REGIONS].map((r) => (
                <button
                  key={r.id ?? "all"}
                  type="button"
                  onClick={() => setRegion(r.id)}
                  aria-pressed={region === r.id}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${region === r.id ? "border-lilac/60 bg-lilac/20 text-lilac" : "border-glass-border text-foreground/85 hover:border-white/30"}`}
                >
                  {name(r)}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[min(60vh,22rem)] overflow-y-auto overscroll-contain p-2">
            <Link href={allHref} onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-medium text-foreground hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              {tr("All Japan")}
              {!currentSlug && <Check size={15} aria-hidden="true" className="text-azure" />}
            </Link>
            {shown.length === 0 ? (
              <p role="status" className="px-3 py-6 text-center text-sm text-foreground/80">{tr("No city or prefecture matches that.")}</p>
            ) : (
              groups.map((g) => (
                <div key={g} className="mt-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/65">{groupName(g)}</p>
                  <ul>
                    {shown.filter((o) => o.group === g).map((o) => (
                      <li key={o.key}>
                        <Link href={o.href} onClick={() => setOpen(false)} aria-current={o.selected ? "page" : undefined} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm text-foreground/95 hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                          <span className="truncate">{name(o)}</span>
                          {o.selected && <Check size={15} aria-hidden="true" className="shrink-0 text-azure" />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
