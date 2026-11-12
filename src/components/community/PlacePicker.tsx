"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink, Loader2, MapPin, Pencil, Search, X } from "lucide-react";
import PlaceTypeIcon from "@/components/community/PlaceTypeIcon";
import { AREAS } from "@/lib/community/areas";
import { PLACE_CATEGORIES, googleMapsUrl, isPlaceCategory, type CommunityPlace } from "@/lib/community/placeTypes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { known } from "@/lib/i18n/translate";
import { useTranslate } from "@/lib/i18n/inline";
import { LIMITS } from "@/lib/community/validation";
import { NO_PLACE, pickedFrom, type PickedPlace } from "@/lib/community/pickedPlace";

export type { PickedPlace };

interface Suggestion {
  type: string;
  label: string;
  sub: string;
  id?: string;
  prefectureId?: string;
}

const field = "h-11 w-full rounded-xl border border-glass-border bg-black/30 px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm";
const small = "h-10 rounded-xl border border-glass-border bg-black/30 px-3 text-sm text-foreground outline-none transition-colors hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40";
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

// "Which place?" Search the sights in Explore as you type, or search the whole
// map (restaurants, cafes, hotels, shops, gyms, salons, addresses…) when you press
// Search — that part uses OpenStreetMap, one search at a time, never as you type.
// Pick a result and its name and address are shown here before anything is
// published, with Change and Remove. A place is always optional: you can also just
// type a name, or leave it empty.
export default function PlacePicker({ value, onChange, describedBy }: { value: PickedPlace; onChange: (p: PickedPlace) => void; describedBy?: string }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const listId = useId();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [map, setMap] = useState<{ state: "idle" | "searching" | "done" | "error"; places: CommunityPlace[]; message?: string }>({ state: "idle", places: [] });
  const [cat, setCat] = useState("");
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [editing, setEditing] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Sights from the Explore catalogue: looked up shortly after typing stops (instant, free).
  useEffect(() => {
    const q = value.label.trim();
    if (value.ref || q.length < 2) return;
    const ctl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/explore/suggest?q=${encodeURIComponent(q)}&lang=${language}`, { signal: ctl.signal });
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setItems((data.suggestions ?? []).filter((s) => s.type === "place" && s.id).slice(0, 6));
        setActive(-1);
      } catch {
        /* the box simply shows no suggestions */
      }
    }, 220);
    return () => {
      window.clearTimeout(t);
      ctl.abort();
    };
  }, [value.label, value.ref, language]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Confirms the place with the website, which re-reads it from its source and
  // (for a map place) saves it once, reusing it if it already exists.
  async function choose(ref: string, fallback: PickedPlace) {
    setSaving(ref);
    setProblem("");
    try {
      const res = await fetch("/api/community/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref }) });
      const data = (await res.json().catch(() => ({}))) as { place?: CommunityPlace; error?: string };
      if (res.ok && data.place) {
        onChange(pickedFrom(data.place));
        setEditing(false);
        setMap({ state: "idle", places: [] });
        setOpen(false);
      } else if (res.status === 401) {
        setProblem("Please sign in to add a place.");
      } else if (ref.startsWith("Q")) {
        // A sight from Explore is known to the website anyway.
        onChange(fallback);
        setEditing(false);
        setOpen(false);
      } else {
        setProblem(data.error ?? "We couldn't use that place. Please try another.");
      }
    } catch {
      setProblem("We couldn't use that place. Please try again.");
    }
    setSaving(null);
  }

  function pickCatalogue(s: Suggestion) {
    void choose(s.id!, { label: s.label, ref: s.id ?? null, areaId: s.prefectureId ?? null });
  }

  async function searchMap() {
    const q = value.label.trim();
    if (q.length < 2) {
      setMap({ state: "error", places: [], message: "Type at least 2 letters first." });
      return;
    }
    setMap({ state: "searching", places: [] });
    setOpen(false);
    try {
      const params = new URLSearchParams({ q });
      if (cat) params.set("cat", cat);
      if (area) params.set("area", area);
      const res = await fetch(`/api/community/places/search?${params}`);
      const data = (await res.json().catch(() => ({}))) as { places?: CommunityPlace[]; error?: string };
      if (!res.ok) setMap({ state: "error", places: [], message: data.error ?? "Map search isn't available right now." });
      else setMap({ state: "done", places: data.places ?? [] });
    } catch {
      setMap({ state: "error", places: [], message: "Map search isn't available right now." });
    }
  }

  // ── a place is chosen: show it ──
  if (value.ref && !editing) {
    const area = AREAS.find((a) => a.id === value.areaId);
    const where = [value.address ?? value.city, area ? (language === "ja" ? area.ja : known(area.en, language)) : null].filter(Boolean).join(" · ");
    return (
      <div aria-describedby={describedBy} className="rounded-2xl border border-azure/40 bg-azure/10 p-3.5">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-azure/20 text-azure">
            <PlaceTypeIcon category={value.category && isPlaceCategory(value.category) ? value.category : "other"} size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold text-foreground">{value.label}</p>
            {where && <p className="mt-0.5 break-words text-xs text-foreground/80">{where}</p>}
            {value.lat != null && value.lon != null && (
              <a href={googleMapsUrl({ lat: value.lat, lon: value.lon })} target="_blank" rel="noopener noreferrer" className={`mt-1.5 inline-flex items-center gap-1 rounded text-xs font-medium text-azure underline-offset-2 hover:underline ${ring}`}>
                {tr("Check it on Google Maps")}
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setEditing(true); onChange({ ...value, ref: null, areaId: null }); }} className={`inline-flex h-10 items-center gap-1.5 rounded-xl border border-glass-border bg-glass-bg px-3.5 text-xs font-medium text-foreground transition-colors hover:border-white/30 ${ring}`}>
            <Pencil size={13} aria-hidden="true" />
            {tr("Change place")}
          </button>
          <button type="button" onClick={() => onChange(NO_PLACE)} className={`inline-flex h-10 items-center gap-1.5 rounded-xl border border-glass-border bg-glass-bg px-3.5 text-xs font-medium text-foreground transition-colors hover:border-sakura/50 hover:text-sakura ${ring}`}>
            <X size={13} aria-hidden="true" />
            {tr("Remove place")}
          </button>
        </div>
      </div>
    );
  }

  const list = value.ref ? [] : items;
  const busy = map.state === "searching";

  return (
    <div ref={box} className="flex flex-col gap-2.5">
      <div className="relative">
        <MapPin size={15} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/60" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open && list.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-describedby={describedBy}
          autoComplete="off"
          maxLength={LIMITS.placeMax}
          value={value.label}
          placeholder={tr("Place name, Japanese name or address")}
          onChange={(e) => {
            onChange({ label: e.target.value, ref: null, areaId: null });
            setMap({ state: "idle", places: [] });
            setProblem("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, list.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              // Enter never submits the whole form from here.
              e.preventDefault();
              if (open && active >= 0 && list[active]) pickCatalogue(list[active]);
              else void searchMap();
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`${field} pl-10`}
        />
        {open && list.length > 0 && (
          <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-glass-border bg-panel p-1 shadow-xl">
            {list.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === active}>
                <button type="button" tabIndex={-1} onClick={() => pickCatalogue(s)} className={`flex min-h-11 w-full flex-col justify-center rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-azure/20" : "hover:bg-white/10"}`}>
                  <span className="text-foreground">{s.label}</span>
                  {s.sub && <span className="text-xs text-foreground/70">{s.sub}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`${listId}-cat`}>{tr("Type of place")}</label>
        <select id={`${listId}-cat`} value={cat} onChange={(e) => setCat(e.target.value)} className={`${small} min-w-0 flex-1 sm:flex-none`}>
          <option value="">{tr("Any type of place")}</option>
          {PLACE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {language === "ja" ? c.ja : known(c.en, language)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`${listId}-area`}>{tr("Prefecture")}</label>
        <select id={`${listId}-area`} value={area} onChange={(e) => setArea(e.target.value)} className={`${small} min-w-0 flex-1 sm:flex-none`}>
          <option value="">{tr("All of Japan")}</option>
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {language === "ja" ? a.ja : known(a.en, language)}
            </option>
          ))}
        </select>
        <button type="button" onClick={searchMap} disabled={busy} className={`inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-4 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-70 ${ring}`}>
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Search size={14} aria-hidden="true" />}
          {tr("Search the map")}
        </button>
      </div>
      <p className="text-[11px] text-foreground/70">{tr("Search restaurants, cafes, hotels, shops and addresses across Japan. A place is optional — you can also just type a name.")}</p>

      {(problem || map.state === "error") && (
        <p role="alert" className="rounded-xl border border-sakura/40 bg-sakura/10 px-3 py-2 text-xs text-foreground">
          {tr(problem || map.message || "Map search isn't available right now.")}
        </p>
      )}

      {map.state === "done" && (
        <div role="status">
          {map.places.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/20 px-3 py-3 text-xs text-foreground/80">{tr("No places found. Try the name with its city (for example “Ichiran Shibuya”), or type the name and leave it unlinked.")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {map.places.map((p) => (
                <li key={p.ref}>
                  <button type="button" disabled={saving !== null} onClick={() => choose(p.ref, pickedFrom(p))} className={`flex min-h-12 w-full items-start gap-3 rounded-xl border border-glass-border bg-glass-bg px-3 py-2.5 text-left transition-colors hover:border-azure/50 disabled:opacity-60 ${ring}`}>
                    <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-azure">
                      {saving === p.ref ? <Loader2 size={15} className="animate-spin" /> : <PlaceTypeIcon category={p.category} size={15} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-medium text-foreground">{language === "ja" ? (p.nameJa ?? p.name) : (p.nameEn ?? p.name)}</span>
                      {p.address && <span className="block break-words text-xs text-foreground/75">{p.address}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] text-foreground/60">{tr("© OpenStreetMap contributors")}</p>
        </div>
      )}
    </div>
  );
}
