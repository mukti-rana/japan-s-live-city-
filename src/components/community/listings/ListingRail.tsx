"use client";

import { playfair } from "@/components/home/cinematic/fonts";
import ListingCard from "@/components/community/listings/ListingCard";
import ArrowLink from "@/components/ui/ArrowLink";
import Tx from "@/components/i18n/Tx";
import type { Listing } from "@/lib/community/listings/types";

// A titled sideways row of listing cards. It says nothing at all when there is nothing real to show (no placeholder events).
export default function ListingRail({ id, title, intro, items, now, href, moreLabel = "See all" }: { id: string; title: string; intro?: string; items: Listing[]; now: number; href?: string; moreLabel?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className={`${playfair.variable} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id={id} className="font-[family-name:var(--font-home-serif)] text-[clamp(26px,3.2vw,40px)] font-normal leading-tight tracking-[-0.015em] text-foreground">
            <Tx en={title} />
          </h2>
          {intro && (
            <p className="mt-1 max-w-[60ch] text-sm text-foreground/65">
              <Tx en={intro} />
            </p>
          )}
        </div>
        {href && (
          <ArrowLink href={href}>
            <Tx en={moreLabel} />
          </ArrowLink>
        )}
      </div>
      <ul className="-mx-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {items.map((l, i) => (
          <li key={l.id} className="w-[78vw] max-w-[21rem] shrink-0 snap-start sm:w-[19rem]">
            <ListingCard l={l} now={now} priority={i === 0} />
          </li>
        ))}
      </ul>
    </section>
  );
}
