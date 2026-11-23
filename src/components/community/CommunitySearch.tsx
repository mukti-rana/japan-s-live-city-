"use client";

import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { MAX_QUERY_LENGTH } from "@/lib/community/feed";
import { useTranslate } from "@/lib/i18n/inline";

// A compact search box: a plain GET form to the Community search page, which
// looks through posts, places, experiences, reviews, people and questions, so
// the results are an ordinary shareable address.
//
// It rests as a small pill ("Search") and opens out to the full width of its row when it is pointed at, focused or has something typed in it (on a
// phone, where nothing points, it is always open): the magnifier grows, its placeholder changes to the full invitation, a light of white follows
// the pointer across it and a small arrow button slides in. Under reduced motion it simply is the wide box.
export default function CommunitySearch({ action = "/community/search", defaultValue }: { action?: string; defaultValue?: string }) {
  const tr = useTranslate();
  const [typed, setTyped] = useState(Boolean(defaultValue));
  return (
    <form
      action={action}
      method="get"
      role="search"
      data-typed={typed}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
      }}
      className={`cm-search group/s relative mx-auto h-10 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none max-sm:w-full sm:hover:w-full sm:focus-within:w-full ${typed ? "w-full" : "w-full sm:w-[11rem]"}`}
    >
      <span aria-hidden="true" className="cm-search__light pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover/s:opacity-100 motion-reduce:hidden" />
      <label className="relative block h-full">
        <span className="sr-only">{tr("Search posts, places, people and more")}</span>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/65 transition-all duration-300 group-hover/s:scale-110 group-hover/s:text-white group-focus-within/s:text-white motion-reduce:transition-none" />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          maxLength={MAX_QUERY_LENGTH}
          onChange={(e) => setTyped(e.target.value.length > 0)}
          placeholder=" "
          enterKeyHint="search"
          className="peer cm-search__input h-full w-full rounded-full border border-white/12 bg-transparent pl-10 pr-11 text-base text-foreground outline-none transition-[border-color,background-color] duration-300 hover:border-white/35 focus:border-white/60 focus:bg-white/[0.03] focus-visible:ring-0 sm:text-sm"
        />
        {/* The placeholder is drawn here so it can be short while the box is small and full when it opens. It goes once something is typed. */}
        <span aria-hidden="true" className="pointer-events-none absolute left-10 right-11 top-1/2 -translate-y-1/2 truncate text-base text-foreground/50 peer-[:not(:placeholder-shown)]:hidden sm:text-sm">
          <span className="sm:group-hover/s:hidden sm:group-focus-within/s:hidden max-sm:hidden sm:[.cm-search[data-typed=true]_&]:hidden">{tr("Search")}</span>
          <span className="hidden max-sm:inline sm:group-hover/s:inline sm:group-focus-within/s:inline sm:[.cm-search[data-typed=true]_&]:inline">{tr("Search posts, places, people and more")}</span>
        </span>
      </label>
      <button type="submit" aria-label={tr("Search")} className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 text-white opacity-0 transition-all duration-300 hover:border-white/60 hover:bg-white/15 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 group-focus-within/s:opacity-100 group-hover/s:opacity-100 max-sm:opacity-100 motion-reduce:transition-none">
        <ArrowRight size={14} aria-hidden="true" />
      </button>
    </form>
  );
}
