"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link2, MapPin, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";
import { LIMITS } from "@/lib/community/validation";

export interface PickedPlace {
  label: string;
  // Set when the person picked a place from Explore; empty for a typed name.
  ref: string | null;
  areaId: string | null;
}

interface Suggestion {
  type: string;
  label: string;
  sub: string;
  id?: string;
  prefectureId?: string;
}

const field = "h-11 w-full rounded-xl border border-glass-border bg-black/30 px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm";

// "Which place?" — search the Explore places as you type and pick one, or just
// type a name (a small street, a shop, a viewpoint) and leave it unlinked.
export default function PlacePicker({ value, onChange, describedBy }: { value: PickedPlace; onChange: (p: PickedPlace) => void; describedBy?: string }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const listId = useId();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  // Look up matches shortly after typing stops. A linked place needs no lookup.
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

  function pick(s: Suggestion) {
    onChange({ label: s.label, ref: s.id ?? null, areaId: s.prefectureId ?? null });
    setOpen(false);
  }

  const list = value.ref ? [] : items;

  return (
    <div ref={box} className="relative">
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
          placeholder={tr("Search a place, or type its name")}
          onChange={(e) => {
            // Typing again after picking a place unlinks it.
            onChange({ label: e.target.value, ref: null, areaId: null });
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
            } else if (e.key === "Enter" && open && active >= 0 && list[active]) {
              e.preventDefault();
              pick(list[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`${field} pl-10`}
        />
      </div>
      {value.ref && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-lilac">
          <Link2 size={12} aria-hidden="true" />
          {tr("Linked to this place in Explore")}
          <button type="button" onClick={() => onChange({ label: value.label, ref: null, areaId: null })} aria-label={tr("Unlink")} className="rounded p-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <X size={12} aria-hidden="true" />
          </button>
        </p>
      )}
      {open && list.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-glass-border bg-panel p-1 shadow-xl">
          {list.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button type="button" tabIndex={-1} onClick={() => pick(s)} className={`flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-azure/20" : "hover:bg-white/10"}`}>
                <span className="text-foreground">{s.label}</span>
                {s.sub && <span className="text-xs text-foreground/70">{s.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
