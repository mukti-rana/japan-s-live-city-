"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { playfair } from "@/components/home/cinematic/fonts";
import { CATEGORY_ICON, CategoryChip, KIND_LABEL, PriceText, StateBadges, WhenText, photosOf, type PhotoSrc } from "@/components/community/listings/ListingPieces";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import Bi from "@/components/community/Bi";
import type { Listing } from "@/lib/community/listings/types";

// One listing as a card. "feature" is the large cinematic card; "card" the standard one; "row" a compact line. With no photograph the cover is a plain
// gradient with the category's icon (never a stock or invented picture). `photo` lets the publishing preview show a picture still on the person's device.
export default function ListingCard({
  l,
  now,
  variant = "card",
  priority = false,
  photo,
  preview = false,
}: {
  l: Listing;
  now: number;
  variant?: "feature" | "card" | "row";
  priority?: boolean;
  photo?: PhotoSrc | null;
  preview?: boolean;
}) {
  const own = photo ?? photosOf(l)[0] ?? null;
  const Icon = CATEGORY_ICON[l.categorySlug] ?? CATEGORY_ICON.other;
  const place = l.areaId ? AREA_BY_ID.get(l.areaId) : null;
  // The prefecture is added after the venue and city, unless the city already says it ("Fukuoka City", "Osaka").
  const area = place && ![l.venueName, l.cityLabel, l.address].some((t) => t?.toLowerCase().includes(place.en.toLowerCase())) ? place : null;
  const where = [l.venueName, l.cityLabel].filter(Boolean).join(", ");
  const href = preview ? undefined : `/community/listing/${l.id}`;
  const src = variant === "feature" ? (own?.src ?? null) : (own?.thumb ?? null);

  const cover = (
    <>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- community photographs live in Supabase storage
        <img src={src} alt={own?.alt ?? l.title} loading={priority ? "eager" : "lazy"} decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/lc:scale-[1.06] motion-reduce:transition-none" />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-20 flex items-center justify-center bg-[radial-gradient(120%_90%_at_20%_0%,rgba(155,107,255,0.28),transparent_60%),radial-gradient(100%_80%_at_100%_100%,rgba(255,179,71,0.2),transparent_60%),#0b0b10]">
          <Icon size={variant === "feature" ? 96 : 56} strokeWidth={1} className="text-white/15" />
        </div>
      )}
    </>
  );

  const inner = (
    <>
      {variant === "row" ? null : cover}
      {variant === "row" ? null : <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,transparent_30%,rgba(0,0,0,0.55)_62%,rgba(0,0,0,0.92)_100%)]" />}
    </>
  );

  if (variant === "row") {
    const body = (
      <>
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0b0b10]">
          {own ? (
            // eslint-disable-next-line @next/next/no-img-element -- community photographs live in Supabase storage
            <img src={own.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Icon size={22} strokeWidth={1.3} className="text-white/35" aria-hidden="true" />
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-foreground">{l.title}</span>
          <span className="mt-0.5 block truncate text-xs text-foreground/70">
            <WhenText l={l} now={now} />
          </span>
          {where && <span className="block truncate text-xs text-foreground/55">{where}</span>}
        </span>
      </>
    );
    return href ? (
      <Link href={href} className="group/lc flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
        {body}
      </Link>
    ) : (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">{body}</div>
    );
  }

  const feature = variant === "feature";
  const frame = `${playfair.variable} group/lc keep-dark-ink relative isolate flex h-full flex-col justify-end overflow-hidden rounded-[26px] border border-white/10 bg-[#0b0b10] text-white shadow-[0_30px_70px_-45px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${feature ? "min-h-[24rem] sm:min-h-[30rem]" : "aspect-[4/5] min-h-[22rem]"}`;
  const content = (
    <>
      {inner}
      <div className="absolute inset-x-0 top-0 flex flex-wrap items-start gap-1.5 p-4">
        <CategoryChip slug={l.categorySlug} />
        <StateBadges l={l} now={now} />
      </div>
      <div className={`relative flex flex-col gap-2 ${feature ? "p-5 sm:p-8" : "p-4"}`}>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/70">
          <Tx en={KIND_LABEL[l.kind]} />
          {(l.kind === "event" || l.kind === "activity") && (
            <>
              {" · "}
              <PriceText l={l} />
            </>
          )}
        </p>
        <h3 className={`font-[family-name:var(--font-home-serif)] font-normal leading-[1.08] tracking-[-0.01em] [text-shadow:0_2px_20px_rgba(0,0,0,0.7)] ${feature ? "text-[clamp(30px,4vw,56px)]" : "line-clamp-3 text-[clamp(21px,1.9vw,27px)]"}`}>{l.title}</h3>
        <p className="text-sm font-medium text-[#ffcf7a] [text-shadow:0_1px_10px_rgba(0,0,0,0.8)]">
          <WhenText l={l} now={now} />
        </p>
        {(where || area) && (
          <p className="flex items-center gap-1.5 text-sm text-white/85">
            <MapPin size={13} aria-hidden="true" className="shrink-0" />
            <span className="truncate">
              {where}
              {where && area ? ", " : ""}
              {area && <Bi en={area.en} ja={area.ja} />}
            </span>
          </p>
        )}
        {feature && l.summary && <p className="line-clamp-2 max-w-[56ch] text-base leading-relaxed text-white/85">{l.summary}</p>}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className={frame}>
      {content}
    </Link>
  ) : (
    <div className={frame}>{content}</div>
  );
}
