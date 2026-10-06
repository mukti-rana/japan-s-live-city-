"use client";

import { Heart } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useFavorites, type FavoriteKind } from "@/lib/personalization/FavoritesContext";

export default function FavoriteButton({
  kind,
  itemKey,
  className = "",
}: {
  kind: FavoriteKind;
  itemKey: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const { isFavorite, toggle } = useFavorites();
  const saved = isFavorite(kind, itemKey);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={t(saved ? "favorites.saved" : "favorites.save")}
      title={t(saved ? "favorites.saved" : "favorites.save")}
      onClick={() => toggle(kind, itemKey)}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-glass-bg-strong backdrop-blur-sm transition-colors ${
        saved ? "text-sakura" : "text-foreground/70 hover:text-sakura"
      } ${className}`}
    >
      <Heart size={15} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
