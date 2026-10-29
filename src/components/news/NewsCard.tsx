"use client";

import { ExternalLink, MapPin, Play } from "lucide-react";
import NewsImage from "@/components/news/NewsImage";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import { placeLabel, timeAgo } from "@/lib/news/useNews";
import type { NewsItem } from "@/lib/news/query";

export type CardVariant = "featured" | "card" | "compact";

const LEVEL_KEY: Record<number, TranslationKey> = {
  3: "news.level.city",
  2: "news.level.prefecture",
  1: "news.level.region",
};

export function useTopicLabel() {
  const { t } = useLanguage();
  return (topic: NewsItem["topic"]): string | null =>
    topic === "general" ? null : t(`news.cat.${topic}` as TranslationKey);
}

function PlayBadge({ large }: { large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/75 text-foreground shadow-lg ring-1 ring-white/25 backdrop-blur-sm transition-transform group-hover/media:scale-110 ${
        large ? "h-14 w-14" : "h-10 w-10"
      }`}
    >
      <Play size={large ? 22 : 16} className="ml-0.5 fill-current" />
    </span>
  );
}

export function Meta({ item, showLevel }: { item: NewsItem; showLevel?: boolean }) {
  const { language, t } = useLanguage();
  const topic = useTopicLabel()(item.topic);
  const place = item.places[0] ? placeLabel(item.places[0], language) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
      <span className="font-medium text-foreground/85">{item.sourceName}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={item.publishedAt} title={new Date(item.publishedAt).toLocaleString(language)}>
        {timeAgo(item.publishedAt, language)}
      </time>
      {topic && <span className="rounded-full bg-azure/15 px-2 py-0.5 text-[10px] font-medium text-azure">{topic}</span>}
      {place && (
        <span className="flex items-center gap-0.5 rounded-full bg-sakura/15 px-2 py-0.5 text-[10px] font-medium text-sakura">
          <MapPin size={9} aria-hidden="true" />
          {place}
        </span>
      )}
      {showLevel && item.level ? (
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">{t(LEVEL_KEY[item.level])}</span>
      ) : null}
    </div>
  );
}

// One story. Clicking the picture or headline opens it inside the site (and
// plays video there); the publisher's page is always one clear link away.
export default function NewsCard({
  item,
  variant = "card",
  onOpen,
  showLevel = false,
  priority = false,
}: {
  item: NewsItem;
  variant?: CardVariant;
  onOpen: (item: NewsItem) => void;
  showLevel?: boolean;
  priority?: boolean;
}) {
  const { t } = useLanguage();
  const jp = item.language === "ja" ? "font-jp" : "";
  const label = item.video ? `${t("news.card.play")}: ${item.title}` : item.title;

  const media = (aspect: string, large = false) => (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={label}
      className={`group/media relative block w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${aspect}`}
    >
      <NewsImage
        src={item.imageUrl}
        pending={item.imagePending}
        priority={priority}
        className="h-full w-full transition-transform duration-500 group-hover/media:scale-[1.03] motion-reduce:transition-none"
      />
      {item.video && <PlayBadge large={large} />}
      {item.video && (
        <span className="absolute left-2 top-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground backdrop-blur-sm">
          {item.video.channel}
        </span>
      )}
    </button>
  );

  const readFull = (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
    >
      {item.video ? t("news.card.watchAtSource") : t("news.card.readFull")}
      <ExternalLink size={11} aria-hidden="true" />
    </a>
  );

  if (variant === "compact") {
    return (
      <article className="flex gap-3">
        <div className="w-24 shrink-0 sm:w-28">{media("aspect-[4/3]")}</div>
        <div className="min-w-0 flex-1">
          <Meta item={item} showLevel={showLevel} />
          <h3 className={`mt-1 line-clamp-3 text-[13px] font-medium leading-snug text-foreground ${jp}`}>
            <button type="button" onClick={() => onOpen(item)} className="text-left hover:text-azure focus-visible:outline-none focus-visible:underline">
              {item.title}
            </button>
          </h3>
        </div>
      </article>
    );
  }

  if (variant === "featured") {
    return (
      <article className="grid gap-4 overflow-hidden rounded-2xl border border-glass-border bg-glass-bg p-3 sm:p-4 lg:grid-cols-[1.35fr_1fr] lg:gap-6">
        {media("aspect-[16/9]", true)}
        <div className="flex min-w-0 flex-col justify-center gap-2.5 lg:py-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-sakura">{t("news.hub.topStory")}</span>
          <Meta item={item} showLevel={showLevel} />
          <h2 className={`text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl ${jp}`}>
            <button type="button" onClick={() => onOpen(item)} className="text-left hover:text-azure focus-visible:outline-none focus-visible:underline">
              {item.title}
            </button>
          </h2>
          {item.summary && <p className={`line-clamp-4 text-sm leading-relaxed text-foreground/75 ${jp}`}>{item.summary}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="rounded-full bg-azure/15 px-3.5 py-1.5 text-xs font-semibold text-azure transition-colors hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              {item.video ? t("news.card.play") : t("news.card.details")}
            </button>
            {readFull}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-glass-border bg-glass-bg p-3 transition-colors hover:border-azure/30">
      {media("aspect-[16/9]")}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Meta item={item} showLevel={showLevel} />
        <h3 className={`line-clamp-3 text-[15px] font-semibold leading-snug text-foreground ${jp}`}>
          <button type="button" onClick={() => onOpen(item)} className="text-left hover:text-azure focus-visible:outline-none focus-visible:underline">
            {item.title}
          </button>
        </h3>
        {item.summary && <p className={`line-clamp-3 text-xs leading-relaxed text-foreground/70 ${jp}`}>{item.summary}</p>}
        <div className="mt-auto pt-1">{readFull}</div>
      </div>
    </article>
  );
}
