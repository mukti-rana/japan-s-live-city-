"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, Heart, MapPin, Navigation, X } from "lucide-react";
import AddToCalendarButton from "@/components/calendar/AddToCalendarButton";
import NewsImage from "@/components/news/NewsImage";
import { EventFacts } from "@/components/events/EventCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { EventView } from "@/lib/events/query";
import { jstDate } from "@/lib/events/time";
import { directionsUrl, formatRange, formatUpdated, mapUrl, osmEmbed, prefectureName, useSavedEvents } from "@/lib/events/useEvents";

const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1.5">
      <h3 id={id} className="text-xs font-semibold uppercase tracking-wide text-azure">
        {title}
      </h3>
      {children}
    </section>
  );
}

// Everything the source tells us about an event, and what it doesn't. Fields a
// source leaves out are shown as "not stated", never filled in.
export default function EventModal({ event, onClose }: { event: EventView | null; onClose: () => void }) {
  const { t, language } = useLanguage();
  const { isSaved, toggle } = useSavedEvents();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!event) return;
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
  }, [event, onClose]);

  if (!event) return null;

  const today = jstDate();
  const saved = isSaved(event.id);
  const dirs = directionsUrl(event);
  const map = mapUrl(event);
  const placeLine = [event.venue, event.address, event.city, prefectureName(event.prefectureId, language)].filter((v, i, a) => v && a.indexOf(v) === i);
  const exact = event.lat !== null && event.lon !== null && !event.locationApprox;
  const listed = formatUpdated(event.announcedAt, language);
  const updated = formatUpdated(event.sourceUpdatedAt, language);

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
        aria-labelledby="event-modal-title"
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
          {event.image && (
            <div className="p-3 pb-0 sm:p-4 sm:pb-0">
              <div className="aspect-video w-full overflow-hidden rounded-xl">
                <NewsImage src={event.image.url} priority className="h-full w-full" />
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                {t("events.detail.imageCredit")}:{" "}
                {event.image.pageUrl ? (
                  <a href={event.image.pageUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                    {event.image.credit}
                  </a>
                ) : (
                  event.image.credit
                )}
                {event.image.licence ? ` · ${event.image.licence}` : ""}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-5 p-4 sm:p-6">
            <div className="flex flex-col gap-3">
              <EventFacts event={event} />
              <h2 id="event-modal-title" className="text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
                {event.title}
              </h2>
            </div>

            {event.typicalDates && (
              <p className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs leading-relaxed text-foreground/85">{t("events.typicalNote")}</p>
            )}

            {event.description && (
              <Section id="ev-about" title={t("events.detail.about")}>
                <p className="text-sm leading-relaxed text-foreground/85">{event.description}</p>
              </Section>
            )}

            <Section id="ev-when" title={t("events.detail.when")}>
              <ul className="text-sm text-foreground/85">
                {event.ranges.slice(0, 6).map((r) => (
                  <li key={r.start + r.end}>{formatRange(r, language, today)}</li>
                ))}
                {event.ranges.length > 6 && <li className="text-muted">+{event.ranges.length - 6}</li>}
              </ul>
              {(event.startTime || event.endTime) && (
                <p className="text-sm text-foreground/85">
                  {event.startTime}
                  {event.endTime ? ` – ${event.endTime}` : ""} <span className="text-[11px] text-muted">(JST)</span>
                </p>
              )}
              {event.dateNote && (
                <p className="text-xs text-muted">
                  {t("events.detail.dateNote")}: {event.dateNote}
                </p>
              )}
            </Section>

            <Section id="ev-where" title={t("events.detail.where")}>
              {placeLine.length > 0 ? (
                <p className="flex items-start gap-1.5 text-sm text-foreground/85">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-sakura" aria-hidden="true" />
                  {placeLine.join(" · ")}
                </p>
              ) : (
                <p className="text-sm text-muted">{t("events.priceNotStated")}</p>
              )}
              {exact && (
                <iframe
                  title={`${t("events.map")}: ${event.title}`}
                  src={osmEmbed(event.lat as number, event.lon as number)}
                  loading="lazy"
                  className="mt-2 h-52 w-full rounded-xl border border-glass-border"
                  referrerPolicy="no-referrer"
                />
              )}
              {event.locationApprox && <p className="text-[11px] text-muted">{t("events.near.approx")}</p>}
            </Section>

            {event.organizer && (
              <Section id="ev-org" title={t("events.detail.organizer")}>
                <p className="text-sm text-foreground/85">{event.organizer}</p>
              </Section>
            )}

            <Section id="ev-price" title={t("events.detail.tickets")}>
              <p className="text-sm text-foreground/85">
                {event.price.free === true ? t("events.free") : (event.price.text ?? t("events.priceNotStated"))}
              </p>
            </Section>

            {(dirs || map) && (
              <Section id="ev-access" title={t("events.detail.access")}>
                <p className="text-xs text-muted">{t("events.detail.accessNote")}</p>
              </Section>
            )}

            <Section id="ev-fresh" title={t("events.detail.freshness")}>
              <ul className="flex flex-col gap-0.5 text-xs text-foreground/75">
                <li>
                  {event.source.name} ·{" "}
                  <a href={event.source.url} target="_blank" rel="noopener noreferrer" className="text-azure hover:underline">
                    {t("events.sources.title")}
                  </a>
                </li>
                {listed && (
                  <li>
                    {t("events.detail.listed")}: {listed}
                  </li>
                )}
                {updated && (
                  <li>
                    {t("events.detail.sourceUpdated")}: {updated}
                  </li>
                )}
              </ul>
              <p className="text-[11px] leading-relaxed text-muted">{t("events.detail.dateVsUpdated")}</p>
            </Section>

            <div className="flex flex-wrap items-center gap-3 border-t border-glass-border pt-4">
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sakura to-neon-purple px-4 py-2 text-sm font-semibold text-background hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {t("events.detail.website")}
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              )}
              {dirs && (
                <a
                  href={dirs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-bg px-4 py-2 text-sm font-medium text-foreground hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
                >
                  <Navigation size={13} aria-hidden="true" />
                  {t("events.directions")}
                </a>
              )}
              <button
                type="button"
                onClick={() => toggle(event.id)}
                aria-pressed={saved}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
                  saved ? "border-sakura/50 bg-sakura/15 text-sakura" : "border-glass-border bg-glass-bg text-foreground hover:border-sakura/40"
                }`}
              >
                <Heart size={13} className={saved ? "fill-current" : ""} aria-hidden="true" />
                {saved ? t("events.unsave") : t("events.save")}
              </button>
              <AddToCalendarButton event={event} />
              <span className="text-[11px] text-muted">{t("events.savedNote")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
