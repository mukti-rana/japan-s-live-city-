"use client";

import { Search } from "lucide-react";
import { MAX_QUERY_LENGTH } from "@/lib/community/feed";
import { useTranslate } from "@/lib/i18n/inline";

// A plain GET form: searching just opens the same page with ?q=..., so the
// results are an ordinary shareable address and need no script to work. The
// topic is kept; the page number starts over.
export default function CommunitySearch({ action, defaultValue, category, region, area, placeType }: { action: string; defaultValue?: string; category?: string; region?: string; area?: string; placeType?: string }) {
  const tr = useTranslate();
  return (
    <form action={action} method="get" role="search" className="flex w-full max-w-xl items-center gap-2">
      {category && <input type="hidden" name="category" value={category} />}
      {region && <input type="hidden" name="region" value={region} />}
      {area && <input type="hidden" name="area" value={area} />}
      {placeType && <input type="hidden" name="type" value={placeType} />}
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{tr("Search posts, places and experiences")}</span>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/60" />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          maxLength={MAX_QUERY_LENGTH}
          placeholder={tr("Search posts, places and experiences")}
          className="h-12 w-full rounded-xl border border-glass-border bg-black/25 pl-10 pr-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm"
        />
      </label>
      <button type="submit" className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        {tr("Search")}
      </button>
    </form>
  );
}
