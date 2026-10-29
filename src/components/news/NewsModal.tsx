"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ExternalLink, Languages, MapPin, ShieldAlert, X } from "lucide-react";
import NewsImage from "@/components/news/NewsImage";
import VideoPlayer from "@/components/news/VideoPlayer";
import { Meta } from "@/components/news/NewsCard";
import { isHazardTopic } from "@/lib/news/categories";
import { fullDate, placeLabel } from "@/lib/news/useNews";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { NewsItem } from "@/lib/news/query";

const GOOGLE_TRANSLATE_CODE: Record<string, string> = { en: "en", ne: "ne", hi: "hi", zh: "zh-CN", ko: "ko" };

const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

// A story opened inside the site: picture or video, the publisher's own
// opening text, the places it names, and a clear link to the original. The
// page behind it (filters, search, scroll position) is left exactly as it was.
export default function NewsModal({ item, onClose }: { item: NewsItem | null; onClose: () => void }) {
  const { t, language } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const nodes = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [item, onClose]);

  if (!item) return null;

  const jp = item.language === "ja" ? "font-jp" : "";
  const translateHref =
    item.language === "ja" && language !== "ja"
      ? `https://translate.google.com/translate?sl=ja&tl=${GOOGLE_TRANSLATE_CODE[language] ?? "en"}&u=${encodeURIComponent(item.url)}`
      : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-modal-title"
        className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-glass-border bg-panel shadow-2xl sm:rounded-3xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("news.detail.close")}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          <X size={17} aria-hidden="true" />
        </button>

        <div className="overflow-y-auto">
          <div className="p-3 pb-0 sm:p-4 sm:pb-0">
            {item.video ? (
              <VideoPlayer
                key={item.video.videoId}
                videoId={item.video.videoId}
                title={item.title}
                channel={item.video.channel}
                watchUrl={item.url}
              />
            ) : (
              <div>
                <div className="aspect-video w-full overflow-hidden rounded-xl">
                  <NewsImage src={item.imageUrl} priority className="h-full w-full" />
                </div>
                {item.imageUrl && (
                  <p className="mt-1.5 text-[11px] text-muted">
                    {t("news.detail.credit")}: {item.sourceName}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-col gap-2">
              <Meta item={item} />
              <p className="text-[11px] text-muted">
                {t("news.detail.published")}: {fullDate(item.publishedAt, language)}
              </p>
              <h2 id="news-modal-title" className={`text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl ${jp}`}>
                {item.title}
              </h2>
            </div>

            {isHazardTopic(item.topic) && (
              <div className="flex items-start gap-2.5 rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs leading-relaxed text-foreground/85">
                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                <p>
                  {t("news.detail.hazard")}{" "}
                  <Link href="/emergency" className="font-semibold text-gold underline-offset-2 hover:underline">
                    {t("news.detail.alertsLink")}
                  </Link>
                </p>
              </div>
            )}

            <section aria-labelledby="news-what">
              <h3 id="news-what" className="text-xs font-semibold uppercase tracking-wide text-azure">
                {t("news.detail.whatHappened")}
              </h3>
              {item.summary ? (
                <>
                  <p className={`mt-1.5 text-sm leading-relaxed text-foreground/85 ${jp}`}>{item.summary}</p>
                  <p className="mt-1.5 text-[11px] text-muted">{t("news.detail.honesty")}</p>
                </>
              ) : (
                <p className="mt-1.5 text-sm text-muted">{t("news.detail.noSummary")}</p>
              )}
            </section>

            {item.places.length > 0 && (
              <section aria-labelledby="news-where">
                <h3 id="news-where" className="text-xs font-semibold uppercase tracking-wide text-sakura">
                  {t("news.detail.where")}
                </h3>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.places.slice(0, 5).map((id) => (
                    <li key={id} className="flex items-center gap-1 rounded-full bg-sakura/15 px-2.5 py-1 text-xs font-medium text-sakura">
                      <MapPin size={11} aria-hidden="true" />
                      {placeLabel(id, language)}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[11px] text-muted">{t("news.detail.whereNote")}</p>
              </section>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-glass-border pt-4">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sakura to-neon-purple px-4 py-2 text-sm font-semibold text-background hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {item.video ? t("news.card.watchAtSource") : t("news.card.readFull")} · {item.sourceName}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              {translateHref && (
                <a
                  href={translateHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-azure focus-visible:outline-none focus-visible:underline"
                >
                  <Languages size={13} aria-hidden="true" />
                  {t("news.detail.translate")}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
