"use client";

import { X } from "lucide-react";
import { useFavorites, type FavoriteKind } from "@/lib/personalization/FavoritesContext";
import { getCity } from "@/lib/data/cities";
import { TRAIN_CITY_META, type TrainCity } from "@/lib/data/trainLines";

const SECTIONS: { kind: FavoriteKind; title: string }[] = [
  { kind: "city", title: "Cities" },
  { kind: "place", title: "Places" },
  { kind: "line", title: "Train lines" },
];

function labelFor(kind: FavoriteKind, key: string): string {
  if (kind === "city") return getCity(key)?.name ?? key;
  if (kind === "line") {
    const [city, ...rest] = key.split("|");
    const cityName = TRAIN_CITY_META[city as TrainCity]?.name;
    return cityName ? `${rest.join("|")} · ${cityName}` : key;
  }
  return key;
}

export default function SavedItems() {
  const { items, ready, toggle } = useFavorites();
  const total = items.city.length + items.place.length + items.line.length;

  if (!ready) return <div className="h-16 animate-pulse rounded-lg bg-glass-bg-strong" />;

  if (total === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted">
        Nothing saved yet. Tap the heart on a city or place, or the star on a train line, and it will
        show up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {SECTIONS.filter(({ kind }) => items[kind].length > 0).map(({ kind, title }) => (
        <div key={kind}>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{title}</p>
          <ul className="flex flex-wrap gap-1.5">
            {items[kind].map((key) => (
              <li
                key={key}
                className="flex items-center gap-1 rounded-full border border-glass-border bg-glass-bg py-1 pl-3 pr-1.5 text-xs text-foreground/90"
              >
                {labelFor(kind, key)}
                <button
                  type="button"
                  aria-label={`Remove ${labelFor(kind, key)}`}
                  onClick={() => toggle(kind, key)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition-colors hover:text-sakura"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
