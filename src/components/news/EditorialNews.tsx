"use client";

import { useState } from "react";
import { ExternalLink, MapPin, Play } from "lucide-react";
import NewsImage, { isKnownBadImage } from "@/components/news/NewsImage";
import { visualTopic } from "@/components/news/NewsCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import { placeLabel, timeAgo } from "@/lib/news/useNews";
import type { NewsItem } from "@/lib/news/query";

// The home page's news, set like a newspaper's front page rather than a feed of cards: one large lead picture with its headline set
// over it, then a numbered column of stories. Each story keeps only what a reader needs at a glance (who published it, how long ago,
// where it is about, and a small mark when it is new or in another language); the category and the "your city" level are left to the News
// page. Same stories, same pictures and the same ways in as the News page's cards (the picture or headline opens the story inside the
// site; the publisher's own page is always one clear link away); nothing here is invented.

const LEVEL_KEY: Record<number, TranslationKey> = { 3: "news.level.city", 2: "news.level.prefecture", 1: "news.level.region" };
const SERIF = "font-[family-name:var(--font-home-serif)]";

// A story has a usable picture of its own (so it can lead).
export const hasPicture = (item: NewsItem) => (Boolean(item.imageUrl) && !isKnownBadImage(item.imageUrl)) || Boolean(item.imagePending);

function Meta({ item, showLevel, light = false }: { item: NewsItem; showLevel?: boolean; light?: boolean }) {
  const { language, t } = useLanguage();
  const tr = useTranslate();
  const place = item.places[0] ? placeLabel(item.places[0], language) : null;
  const [now] = useState(() => Date.now());
  const isNew = now - new Date(item.publishedAt).getTime() < 3 * 3600_000;
  const original = item.language !== language ? item.language : null;
  const dim = light ? "text-white/70" : "text-muted";
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] ${dim}`}>
      <span className={`font-semibold ${light ? "text-white" : "text-foreground/90"}`}>{item.sourceName}</span>
      <span aria-hidden="true" className="opacity-50">
        ·
      </span>
      <time dateTime={item.publishedAt} title={new Date(item.publishedAt).toLocaleString(language)}>
        {timeAgo(item.publishedAt, language)}
      </time>
      {isNew && (
        <span className="flex items-center gap-1 font-semibold uppercase tracking-wide text-mint">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mint" />
          {tr("New")}
        </span>
      )}
      {place && (
        <span className="flex items-center gap-0.5 font-medium text-sakura">
          <MapPin size={10} aria-hidden="true" />
          {place}
        </span>
      )}
      {showLevel && item.level ? <span className="font-medium text-gold">{t(LEVEL_KEY[item.level])}</span> : null}
      {original && (
        <span title={original === "ja" ? tr("Original: Japanese") : tr("Original: English")} className="rounded border border-current/30 px-1 text-[9px] font-semibold uppercase tracking-wide opacity-80">
          {original}
        </span>
      )}
    </div>
  );
}

function PlayMark({ big = false }: { big?: boolean }) {
  return (
    <span aria-hidden="true" className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/30 backdrop-blur-sm ${big ? "h-14 w-14" : "h-8 w-8"}`}>
      <Play size={big ? 22 : 13} className="ml-0.5 fill-current" />
    </span>
  );
}

// The lead: a large picture, then the headline set big in the page's serif underneath. (Publishers' pictures are often graphics with their own
// lettering, such as a programme logo, so no text is laid over the picture.) The picture settles slowly toward you when pointed at.
export function EditorialLead({ item, onOpen, showLevel = false }: { item: NewsItem; onOpen: (item: NewsItem) => void; showLevel?: boolean }) {
  const { t } = useLanguage();
  const jp = item.language === "ja";
  const topic = visualTopic(item);
  const label = item.video ? `${t("news.card.play")}: ${item.title}` : item.title;
  return (
    <article className="group/lead flex h-full min-w-0 flex-col gap-4">
      <button type="button" onClick={() => onOpen(item)} aria-label={label} className="relative block aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure lg:aspect-auto lg:min-h-[15rem] lg:flex-1">
        <NewsImage src={item.imageUrl} topic={topic} size="hero" pending={item.imagePending} priority className="h-full w-full transition-transform duration-[1400ms] ease-out group-hover/lead:scale-[1.04] motion-reduce:transition-none" />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        {item.video && <PlayMark big />}
      </button>
      <div className="flex flex-col gap-2.5">
        <span className="w-fit text-[11px] font-semibold uppercase tracking-[0.22em] text-sakura">{t("news.hub.topStory")}</span>
        <h3 className={`line-clamp-3 text-[clamp(1.4rem,2.1vw,2rem)] font-normal leading-[1.2] tracking-[-0.01em] text-foreground ${jp ? "font-jp font-medium" : SERIF}`}>
          <button type="button" onClick={() => onOpen(item)} className="text-left underline decoration-transparent underline-offset-[6px] transition-colors hover:decoration-white/40 focus-visible:outline-none focus-visible:underline">
            {item.title}
          </button>
        </h3>
        {item.summary && <p className={`line-clamp-2 max-w-[62ch] text-sm leading-relaxed text-foreground/70 ${jp ? "font-jp" : ""}`}>{item.summary}</p>}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-0.5">
          <Meta item={item} showLevel={showLevel} />
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {item.video ? t("news.card.watchAtSource") : t("news.card.readFull")}
            <ExternalLink size={11} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

// A numbered story: the number in the page's serif, a small picture, then publisher, age, place and the headline (two lines).
export function EditorialRow({ item, index, onOpen, showLevel = false }: { item: NewsItem; index?: number; onOpen: (item: NewsItem) => void; showLevel?: boolean }) {
  const { t } = useLanguage();
  const jp = item.language === "ja";
  const topic = visualTopic(item);
  return (
    <article className="group/row flex items-start gap-3.5 sm:gap-4">
      {index !== undefined && <span aria-hidden="true" className={`${SERIF} w-8 shrink-0 pt-0.5 text-[1.7rem] leading-none text-white/25 transition-colors duration-300 group-hover/row:text-sakura`}>{String(index).padStart(2, "0")}</span>}
      <button type="button" onClick={() => onOpen(item)} aria-label={item.video ? `${t("news.card.play")}: ${item.title}` : item.title} className="relative block aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure sm:w-28">
        <NewsImage src={item.imageUrl} topic={topic} size="thumb" pending={item.imagePending} className="h-full w-full transition-transform duration-500 group-hover/row:scale-[1.07] motion-reduce:transition-none" />
        {item.video && <PlayMark />}
      </button>
      <div className="min-w-0 flex-1 transition-transform duration-300 group-hover/row:translate-x-0.5 motion-reduce:transform-none">
        <Meta item={item} showLevel={showLevel} />
        <h4 className={`mt-1.5 line-clamp-2 text-[15px] font-medium leading-snug text-foreground ${jp ? "font-jp" : ""}`}>
          <button type="button" onClick={() => onOpen(item)} className="text-left underline decoration-transparent underline-offset-4 transition-colors hover:decoration-white/50 focus-visible:outline-none focus-visible:underline">
            {item.title}
          </button>
        </h4>
      </div>
    </article>
  );
}
