"use client";

import { CalendarDays, Clock, ExternalLink, Flame, Heart, Landmark, MapPin, Music, Navigation, Palette, PartyPopper, Trophy, Users, Utensils, type LucideIcon } from "lucide-react";
import AddToCalendarButton from "@/components/calendar/AddToCalendarButton";
import NewsImage from "@/components/news/NewsImage";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import { jstDate } from "@/lib/events/time";
import type { EventView } from "@/lib/events/query";
import { formatRange, mapUrl, prefectureName, startsIn, useSavedEvents } from "@/lib/events/useEvents";

export type EventCardVariant = "featured" | "card" | "compact";

const KIND_STYLE: Record<EventView["kind"], { icon: LucideIcon; gradient: string }> = {
  festival: { icon: PartyPopper, gradient: "from-sakura/35 via-neon-purple/25 to-panel" },
  fireworks: { icon: Flame, gradient: "from-gold/30 via-sakura/25 to-panel" },
  music: { icon: Music, gradient: "from-neon-purple/35 via-azure/25 to-panel" },
  food: { icon: Utensils, gradient: "from-gold/30 via-mint/20 to-panel" },
  culture: { icon: Landmark, gradient: "from-sakura/25 via-gold/20 to-panel" },
  art: { icon: Palette, gradient: "from-neon-cyan/25 via-neon-purple/25 to-panel" },
  sports: { icon: Trophy, gradient: "from-mint/30 via-azure/20 to-panel" },
  community: { icon: Users, gradient: "from-azure/30 via-neon-purple/20 to-panel" },
  other: { icon: CalendarDays, gradient: "from-azure/25 via-neon-purple/15 to-panel" },
};

// Shown when an event has no photo from its source: a date tile with the
// type of event. It says plainly "no photo" — it never stands in a picture of
// something else.
function EventTile({ event, className = "" }: { event: EventView; className?: string }) {
  const { language } = useLanguage();
  const { icon: Icon, gradient } = KIND_STYLE[event.kind];
  const date = new Date(`${event.current.start}T00:00:00+09:00`);
  const month = new Intl.DateTimeFormat(language, { timeZone: "Asia/Tokyo", month: "short" }).format(date);
  const day = new Intl.DateTimeFormat(language, { timeZone: "Asia/Tokyo", day: "numeric" }).format(date);
  return (
    <div className={`relative flex items-center justify-center bg-gradient-to-br ${gradient} ${className}`} aria-hidden="true">
      <Icon size={72} className="absolute -bottom-3 -right-3 text-white/[0.07]" />
      <div className="flex flex-col items-center leading-none">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/70">{month}</span>
        <span className="mt-1 text-4xl font-bold text-foreground">{day}</span>
      </div>
    </div>
  );
}

function capitalize(text: string, language: string): string {
  return text ? text.charAt(0).toLocaleUpperCase(language) + text.slice(1) : text;
}

// What stage the event is at, in plain words. Cancelled and postponed always
// win over the dates, so nobody is told an event is "tomorrow" when it isn't.
export function StatusBadge({ event }: { event: EventView }) {
  const { t, language } = useLanguage();
  let label: string;
  let tone: string;
  if (event.status === "cancelled") {
    label = t("events.status.cancelled");
    tone = "bg-sakura/20 text-sakura";
  } else if (event.status === "postponed") {
    label = t("events.status.postponed");
    tone = "bg-gold/20 text-gold";
  } else if (event.phase === "now") {
    label = t("events.status.now");
    tone = "bg-mint/20 text-mint";
  } else if (event.phase === "upcoming" && event.daysUntil !== null) {
    label = capitalize(startsIn(event.daysUntil, language), language);
    tone = "bg-azure/20 text-azure";
  } else {
    label = t("events.status.ended");
    tone = "bg-white/10 text-muted";
  }
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{label}</span>;
}

function SaveButton({ event, className = "" }: { event: EventView; className?: string }) {
  const { t } = useLanguage();
  const { isSaved, toggle } = useSavedEvents();
  const saved = isSaved(event.id);
  return (
    <button
      type="button"
      onClick={() => toggle(event.id)}
      aria-pressed={saved}
      aria-label={saved ? t("events.unsave") : t("events.save")}
      title={saved ? t("events.unsave") : t("events.save")}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
        saved ? "border-sakura/50 bg-sakura/20 text-sakura" : "border-glass-border bg-glass-bg text-muted hover:text-foreground"
      } ${className}`}
    >
      <Heart size={14} className={saved ? "fill-current" : ""} aria-hidden="true" />
    </button>
  );
}

export function EventFacts({ event, showKind = true }: { event: EventView; showKind?: boolean }) {
  const { t, language } = useLanguage();
  const place = [event.city, prefectureName(event.prefectureId, language)].filter((v, i, a) => v && a.indexOf(v) === i).join(", ");
  return (
    <div className="flex flex-col gap-1.5 text-xs text-foreground/80">
      <div className="flex flex-wrap items-center gap-1.5">
        {showKind && (
          <span className="rounded-full bg-neon-purple/20 px-2 py-0.5 text-[10px] font-semibold text-neon-purple">
            {t(`events.kind.${event.kind}` as TranslationKey)}
          </span>
        )}
        <StatusBadge event={event} />
        {event.typicalDates && (
          <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[10px] font-medium text-gold">{t("events.typical")}</span>
        )}
        {event.price.free === true && <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">{t("events.free")}</span>}
      </div>
      <p className="flex items-center gap-1.5">
        <CalendarDays size={12} className="shrink-0 text-azure" aria-hidden="true" />
        <span>{formatRange(event.current, language, jstDate())}</span>
        {event.startTime && (
          <span className="flex items-center gap-1 text-muted">
            <Clock size={11} aria-hidden="true" />
            {event.startTime}
            {event.endTime ? `–${event.endTime}` : ""}
          </span>
        )}
      </p>
      {(place || event.venue) && (
        <p className="flex items-start gap-1.5">
          <MapPin size={12} className="mt-0.5 shrink-0 text-sakura" aria-hidden="true" />
          <span className="line-clamp-2 min-w-0">
            {event.venue && <span className="font-medium">{event.venue}</span>}
            {event.venue && place ? " · " : ""}
            {place}
            {event.distanceKm !== null && !event.locationApprox && (
              <span className="ml-1.5 text-muted">
                · {event.distanceKm} {t("events.near.km")}
              </span>
            )}
          </span>
        </p>
      )}
    </div>
  );
}

export default function EventCard({
  event,
  variant = "card",
  onOpen,
  priority = false,
}: {
  event: EventView;
  variant?: EventCardVariant;
  onOpen: (event: EventView) => void;
  priority?: boolean;
}) {
  const { t } = useLanguage();
  const jp = /[぀-ヿ一-鿿]/.test(event.title) ? "font-jp" : "";
  const map = mapUrl(event);
  const ended = event.phase === "ended" || event.status === "cancelled";

  const media = (aspect: string) => (
    <button
      type="button"
      onClick={() => onOpen(event)}
      aria-label={`${t("events.details")}: ${event.title}`}
      className={`group/media relative block w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${aspect}`}
    >
      {event.image ? (
        <NewsImage
          src={event.image.url}
          priority={priority}
          className={`h-full w-full transition-transform duration-500 group-hover/media:scale-[1.03] motion-reduce:transition-none ${ended ? "opacity-60 grayscale" : ""}`}
        />
      ) : (
        <EventTile event={event} className={`h-full w-full ${ended ? "opacity-60 grayscale" : ""}`} />
      )}
    </button>
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => onOpen(event)}
        className="rounded-full bg-azure/15 px-3 py-1.5 text-xs font-semibold text-azure transition-colors hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
      >
        {t("events.details")}
      </button>
      {map && (
        <a
          href={map}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-azure focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          <Navigation size={11} aria-hidden="true" />
          {t("events.map")}
        </a>
      )}
      <SaveButton event={event} className="ml-auto" />
      {variant !== "compact" && (
        <div className="basis-full">
          <AddToCalendarButton event={event} compact />
        </div>
      )}
    </div>
  );

  if (variant === "compact") {
    return (
      <article className="flex gap-3">
        <div className="w-24 shrink-0 sm:w-28">{media("aspect-[4/3]")}</div>
        <div className="min-w-0 flex-1">
          <EventFacts event={event} showKind={false} />
          <h3 className={`mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-foreground ${jp}`}>
            <button type="button" onClick={() => onOpen(event)} className="text-left hover:text-azure focus-visible:outline-none focus-visible:underline">
              {event.title}
            </button>
          </h3>
        </div>
      </article>
    );
  }

  if (variant === "featured") {
    return (
      <article className="grid gap-4 overflow-hidden rounded-2xl border border-glass-border bg-glass-bg p-3 sm:p-4 lg:grid-cols-[1.3fr_1fr] lg:gap-6">
        {media("aspect-[16/9]")}
        <div className="flex min-w-0 flex-col justify-center gap-3 lg:py-2">
          <EventFacts event={event} />
          <h2 className={`text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl ${jp}`}>
            <button type="button" onClick={() => onOpen(event)} className="text-left hover:text-azure focus-visible:outline-none focus-visible:underline">
              {event.title}
            </button>
          </h2>
          {event.description && <p className="line-clamp-4 text-sm leading-relaxed text-foreground/75">{event.description}</p>}
          <p className="text-[11px] text-muted">{event.source.name}</p>
          {actions}
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-glass-border bg-glass-bg p-3 transition-colors hover:border-azure/30">
      {media("aspect-[16/9]")}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <EventFacts event={event} />
        <h3 className={`line-clamp-3 text-[15px] font-semibold leading-snug text-foreground ${jp}`}>
          <button type="button" onClick={() => onOpen(event)} className="text-left hover:text-azure focus-visible:outline-none focus-visible:underline">
            {event.title}
          </button>
        </h3>
        {event.description && <p className="line-clamp-2 text-xs leading-relaxed text-foreground/70">{event.description}</p>}
        <p className="flex items-center gap-1 text-[11px] text-muted">
          {event.url ? (
            <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-azure hover:underline">
              {event.organizer ?? event.source.name}
              <ExternalLink size={10} aria-hidden="true" />
            </a>
          ) : (
            (event.organizer ?? event.source.name)
          )}
        </p>
        <div className="mt-auto pt-1">{actions}</div>
      </div>
    </article>
  );
}
