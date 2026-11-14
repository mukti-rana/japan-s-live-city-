"use client";

import { Search } from "lucide-react";
import { MAX_QUERY_LENGTH } from "@/lib/community/feed";
import { useTranslate } from "@/lib/i18n/inline";

// A compact search box: a plain GET form to the Community search page, which
// looks through posts, places, experiences, reviews, people and questions, so
// the results are an ordinary shareable address.
export default function CommunitySearch({ action = "/community/search", defaultValue }: { action?: string; defaultValue?: string }) {
  const tr = useTranslate();
  return (
    <form action={action} method="get" role="search" className="w-full">
      <label className="relative block">
        <span className="sr-only">{tr("Search posts, places, people and more")}</span>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/60" />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          maxLength={MAX_QUERY_LENGTH}
          placeholder={tr("Search posts, places, people and more")}
          enterKeyHint="search"
          className="h-10 w-full rounded-xl border border-white/10 bg-cm-input pl-10 pr-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground/50 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/30 sm:text-sm"
        />
      </label>
    </form>
  );
}
