"use client";

import { Tag } from "lucide-react";
import Bi from "@/components/community/Bi";
import Tx from "@/components/i18n/Tx";
import { CATEGORY_ICON, stateOf } from "@/lib/community/listings/display";
import { LISTING_CATEGORY_BY_SLUG } from "@/lib/community/listings/categories";
import { displayStart, formatDay, formatWhen, nextOccurrence, RECURRENCE_LABEL } from "@/lib/community/listings/time";
import type { Listing } from "@/lib/community/listings/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const chip = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-md";

export function CategoryChip({ slug, tone = "dark" }: { slug: string; tone?: "dark" | "plain" }) {
  const c = LISTING_CATEGORY_BY_SLUG.get(slug);
  const Icon = CATEGORY_ICON[slug] ?? Tag;
  if (!c) return null;
  return (
    <span className={`${chip} ${tone === "dark" ? "border-white/20 bg-black/45 text-white" : "border-white/15 bg-white/[0.05] text-foreground/90"}`}>
      <Icon size={12} aria-hidden="true" />
      <Bi en={c.en} ja={c.ja} />
    </span>
  );
}

// LIVE and the other states, each with a word as well as a colour.
export function StateBadges({ l, now }: { l: Listing; now: number }) {
  const s = stateOf(l, now);
  return (
    <>
      {l.status === "cancelled" && (
        <span className={`${chip} border-[#ff7a7a]/50 bg-[#ff7a7a]/15 text-[#ffb0b0]`}>
          <Tx en="Cancelled" />
        </span>
      )}
      {l.postponed && l.status !== "cancelled" && (
        <span className={`${chip} border-[#ffc26b]/50 bg-[#ffc26b]/15 text-[#ffd9a0]`}>
          <Tx en="Postponed" />
        </span>
      )}
      {s.phase === "live" && l.status === "published" && !l.postponed && (
        <span className={`${chip} border-[#4ade80]/50 bg-[#4ade80]/15 text-[#7ef0a6]`} suppressHydrationWarning>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-70 motion-reduce:hidden" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
          </span>
          <Tx en="Happening now" />
        </span>
      )}
      {s.phase === "past" && l.status !== "cancelled" && (
        <span className={`${chip} border-white/20 bg-white/[0.06] text-white/75`}>
          <Tx en="Ended" />
        </span>
      )}
      {l.sponsored && (
        <span className={`${chip} border-[#b496ff]/50 bg-[#b496ff]/15 text-[#dccfff]`}>
          <Tx en="Sponsored" />
        </span>
      )}
      {l.featured && (
        <span className={`${chip} border-[#ffc26b]/50 bg-[#ffc26b]/15 text-[#ffd9a0]`}>
          <Tx en="Featured" />
        </span>
      )}
    </>
  );
}

// "Sat, 24 Jul 2027 · 18:00 – 21:00" for an event (its current or next occurrence); "Until …" for an announcement or promotion that expires.
export function WhenText({ l, now }: { l: Listing; now: number }) {
  const { language } = useLanguage();
  const timed = l.kind === "event" || l.kind === "activity";
  let text = "";
  if (timed && l.startsAt) {
    const occ = nextOccurrence(l, now);
    const start = occ?.start ?? displayStart(l, now) ?? new Date(l.startsAt).getTime();
    const end = occ?.end ?? (l.endsAt ? new Date(l.endsAt).getTime() : null);
    text = formatWhen(start, l.endsAt || l.recurrence !== "none" ? end : null, l.allDay, language);
  } else if (l.endsAt) {
    text = `${l.startsAt ? `${formatDay(new Date(l.startsAt).getTime(), language)} – ` : ""}${formatDay(new Date(l.endsAt).getTime(), language)}`;
  } else if (l.startsAt) {
    text = formatDay(new Date(l.startsAt).getTime(), language);
  }
  return (
    <span suppressHydrationWarning>
      {text}
      {timed && l.recurrence !== "none" ? (
        <>
          {text ? " · " : ""}
          <Tx en={RECURRENCE_LABEL[l.recurrence]} />
        </>
      ) : null}
    </span>
  );
}

export function PriceText({ l }: { l: Listing }) {
  if (l.kind !== "event" && l.kind !== "activity") return null;
  return l.isFree ? <Tx en="Free" /> : <>{l.priceText}</>;
}
