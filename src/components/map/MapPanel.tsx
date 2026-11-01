"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, ChevronDown, ChevronUp, CloudSun, ExternalLink, MapPin, Newspaper, TrainFront, X } from "lucide-react";
import WeatherIcon from "@/components/ui/WeatherIcon";
import { useLazyJson } from "@/components/map/useMapData";
import { SEVERITY_COLOR } from "@/components/map/markerIcons";
import type { MapCity } from "@/lib/map/cities";
import { tempColor } from "@/lib/map/cities";
import type { OfficialAlert } from "@/lib/emergency/disaster";
import type { EventView, EventsResult } from "@/lib/events/query";
import { formatRange } from "@/lib/events/useEvents";
import { useInline, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { NewsResult } from "@/lib/news/query";
import { timeAgo } from "@/lib/news/useNews";
import type { MapWeatherPoint, WeatherSnapshot } from "@/lib/services/weather";

const TEXT = {
  close: { en: "Close", ja: "閉じる" },
  collapse: { en: "Collapse panel", ja: "パネルを縮める" },
  expand: { en: "Expand panel", ja: "パネルを広げる" },
  feels: { en: "Feels like", ja: "体感" },
  rain: { en: "Chance of rain today", ja: "今日の降水確率" },
  updated: { en: "Updated", ja: "更新" },
  wxUnavailable: { en: "Weather isn't available right now.", ja: "現在、天気を取得できません。" },
  wxLoading: { en: "Loading weather…", ja: "天気を読み込み中…" },
  alerts: { en: "Official alerts", ja: "公的な警報・注意報" },
  alertsNone: { en: "No warnings or advisories from JMA for this area right now.", ja: "この地域に現在、気象庁の警報・注意報はありません。" },
  alertsStale: { en: "Some JMA warning reports are over 36 hours old and aren't shown as current — check JMA for the live picture.", ja: "一部の気象庁の警報発表が36時間以上前のため、現在の情報としては表示していません。気象庁で最新情報をご確認ください。" },
  alertsDown: { en: "Alert information isn't available right now.", ja: "警報情報を取得できません。" },
  news: { en: "Local news", ja: "地域のニュース" },
  newsNone: { en: "No recent local stories found.", ja: "最近の地域ニュースは見つかりませんでした。" },
  newsDown: { en: "News isn't available right now.", ja: "ニュースを取得できません。" },
  moreNews: { en: "More news", ja: "ニュースをもっと見る" },
  trains: { en: "Trains", ja: "電車" },
  trainsNone: { en: "Live train status isn't connected yet, so no delays are shown here.", ja: "電車の運行情報は未接続のため、遅延情報は表示していません。" },
  trainsOpen: { en: "Open Trains", ja: "電車ページへ" },
  events: { en: "Events in", ja: "イベント：" },
  eventsNone: { en: "No current events found for this area.", ja: "この地域の開催中・開催予定のイベントは見つかりませんでした。" },
  eventsDown: { en: "Events aren't available right now.", ja: "イベントを取得できません。" },
  moreEvents: { en: "More events", ja: "イベントをもっと見る" },
  cityPage: { en: "City page", ja: "都市ページ" },
  forecast: { en: "Forecast", ja: "天気予報" },
  source: { en: "Source", ja: "出典" },
  approx: { en: "Position is approximate (city centre)", ja: "位置は市の中心付近（おおよそ）" },
  when: { en: "Date", ja: "日付" },
  where: { en: "Where", ja: "場所" },
  organizerPage: { en: "Organizer's page", ja: "主催者のページ" },
  openInEvents: { en: "Open in Events", ja: "イベントページで開く" },
  typical: { en: "Usual dates — not confirmed", ja: "例年の日程（未確認）" },
  retry: { en: "Try again", ja: "再試行" },
} satisfies Table;

export type Selection =
  | { type: "city"; slug: string }
  | { type: "place"; id: string; name: string; nameJa?: string; sub: string; lat: number; lon: number; prefectureId?: string }
  | { type: "events"; key: string };

export interface EventGroup {
  key: string;
  lat: number;
  lon: number;
  events: EventView[];
}

export interface AlertsPayload {
  byPrefecture: Record<string, OfficialAlert[]>;
  national: OfficialAlert[];
  unavailable: string[];
  notes: string[];
  checkedAt: number;
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-glass-border pt-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Weather({ point, loading, text }: { point: MapWeatherPoint | null; loading: boolean; text: (k: keyof typeof TEXT) => string }) {
  if (!point) {
    return <p className="text-sm text-muted">{loading ? text("wxLoading") : text("wxUnavailable")}</p>;
  }
  return (
    <div className="flex items-center gap-4">
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-glass-bg"
        style={{ borderColor: tempColor(point.tempC), color: tempColor(point.tempC) }}
      >
        <WeatherIcon icon={point.icon} size={28} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-4xl font-semibold leading-none tabular-nums text-foreground">
          {point.tempC}
          <span className="align-top text-lg font-medium text-foreground/60">°C</span>
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{point.condition}</p>
        <p className="text-xs text-muted">
          {text("feels")} {point.feelsLikeC}°{point.rainChance !== null ? ` · ${text("rain")}: ${point.rainChance}%` : ""}
        </p>
      </div>
    </div>
  );
}

function AlertList({ alerts, text }: { alerts: OfficialAlert[]; text: (k: keyof typeof TEXT) => string }) {
  const { language } = useLanguage();
  return (
    <ul className="flex flex-col gap-2">
      {alerts.map((a) => (
        <li key={a.id} className="rounded-xl border border-glass-border bg-glass-bg p-2.5 text-sm">
          <p className="flex items-start gap-2 font-medium text-foreground">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[a.severity] }} aria-hidden="true" />
            <span>{language === "ja" ? a.titleJa : a.title}</span>
          </p>
          <p className="mt-0.5 pl-4 text-xs text-muted">
            {a.area} · {a.issuer}
          </p>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 pl-4 text-xs text-azure hover:underline">
            {text("source")}: JMA <ExternalLink size={10} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function CityDetails({
  city,
  weather,
  weatherLoading,
  alerts,
  alertsOn,
  alertsLoading,
  today,
}: {
  city: MapCity;
  weather: MapWeatherPoint | null;
  weatherLoading: boolean;
  alerts: AlertsPayload | null;
  alertsOn: boolean;
  alertsLoading: boolean;
  today: string;
}) {
  const { language } = useLanguage();
  const text = useInline(TEXT);
  const news = useLazyJson<NewsResult>(`/api/news?cat=local&place=${encodeURIComponent(city.name)}&limit=10`);
  const events = useLazyJson<EventsResult>(`/api/events?pref=${city.prefectureId}&limit=3`);
  // Only stories that name this city or its prefecture count as local; the
  // wider-region matches the News page also offers are left out here.
  const localNews = (news.data?.items ?? []).filter((n) => (n.level ?? 0) >= 2).slice(0, 3);
  const cityAlerts = alerts?.byPrefecture[city.prefectureId] ?? null;
  const alertsDown = alerts ? alerts.unavailable.includes(city.prefectureId) : false;

  return (
    <div className="flex flex-col gap-3">
      <Weather point={weather} loading={weatherLoading} text={text} />
      {weather && <p className="-mt-1 text-[11px] text-muted">{text("updated")} {weather.updatedAt.slice(11, 16)} JST · Open-Meteo</p>}

      {alertsOn && (
        <Block icon={<AlertTriangle size={12} aria-hidden="true" />} title={text("alerts")}>
          {alertsLoading ? (
            <p className="text-sm text-muted">…</p>
          ) : !alerts || alertsDown ? (
            <p className="text-sm text-muted">{text("alertsDown")}</p>
          ) : cityAlerts && cityAlerts.length > 0 ? (
            <AlertList alerts={cityAlerts} text={text} />
          ) : (
            <p className="text-sm text-muted">
              {text("alertsNone")}
              {alerts.notes.length > 0 && <span className="mt-1 block text-gold">{text("alertsStale")}</span>}
            </p>
          )}
        </Block>
      )}

      <Block icon={<Newspaper size={12} aria-hidden="true" />} title={text("news")}>
        {news.loading ? (
          <p className="text-sm text-muted">…</p>
        ) : news.failed ? (
          <p className="text-sm text-muted">{text("newsDown")}</p>
        ) : localNews.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {localNews.map((n) => (
              <li key={n.id}>
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="group block">
                  <span className={`line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-azure ${n.language === "ja" ? "font-jp" : ""}`}>{n.title}</span>
                  <span className="text-[11px] text-muted">
                    {n.sourceName} · {timeAgo(n.publishedAt, language)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{text("newsNone")}</p>
        )}
        <Link href={`/news?cat=local`} className="mt-2 inline-block text-xs font-medium text-azure hover:underline">
          {text("moreNews")} →
        </Link>
      </Block>

      <Block icon={<TrainFront size={12} aria-hidden="true" />} title={text("trains")}>
        <p className="text-sm text-muted">{text("trainsNone")}</p>
        <Link href="/trains" className="mt-1 inline-block text-xs font-medium text-azure hover:underline">
          {text("trainsOpen")} →
        </Link>
      </Block>

      <Block icon={<CalendarDays size={12} aria-hidden="true" />} title={`${text("events")} ${city.prefecture}`}>
        {events.loading ? (
          <p className="text-sm text-muted">…</p>
        ) : events.failed ? (
          <p className="text-sm text-muted">{text("eventsDown")}</p>
        ) : events.data && events.data.items.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {events.data.items.slice(0, 3).map((e) => (
              <li key={e.id} className="text-sm">
                <p className="line-clamp-2 font-medium leading-snug text-foreground">{e.title}</p>
                <p className="text-[11px] text-muted">
                  {e.typicalDates ? `${text("typical")} · ` : ""}
                  {formatRange(e.current, language, today)}
                  {e.city ? ` · ${e.city}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{text("eventsNone")}</p>
        )}
        <Link href={`/events?pref=${city.prefectureId}`} className="mt-2 inline-block text-xs font-medium text-azure hover:underline">
          {text("moreEvents")} →
        </Link>
      </Block>

      <div className="flex flex-wrap gap-2 border-t border-glass-border pt-3">
        {city.cityPage && (
          <Link href={`/${city.slug}`} className="rounded-full bg-azure/15 px-3 py-1.5 text-xs font-semibold text-azure hover:bg-azure/25">
            {text("cityPage")} →
          </Link>
        )}
        <Link href="/weather" className="rounded-full border border-glass-border px-3 py-1.5 text-xs font-medium text-foreground/85 hover:border-azure/40">
          {text("forecast")}
        </Link>
      </div>
    </div>
  );
}

function PlaceDetails({ sel }: { sel: Extract<Selection, { type: "place" }> }) {
  const text = useInline(TEXT);
  const wx = useLazyJson<WeatherSnapshot>(`/api/weather/live?lat=${sel.lat.toFixed(2)}&lon=${sel.lon.toFixed(2)}`);
  const point: MapWeatherPoint | null = wx.data
    ? { tempC: wx.data.tempC, feelsLikeC: wx.data.feelsLikeC, condition: wx.data.condition, icon: wx.data.icon, rainChance: wx.data.todayPrecipProbability, updatedAt: wx.data.updatedAt }
    : null;
  return (
    <div className="flex flex-col gap-3">
      <Weather point={point} loading={wx.loading} text={text} />
      {wx.failed && <p className="text-sm text-muted">{text("wxUnavailable")}</p>}
      <div className="flex flex-wrap gap-2 border-t border-glass-border pt-3">
        {sel.prefectureId && (
          <>
            <Link href={`/news?pref=${sel.prefectureId}`} className="rounded-full border border-glass-border px-3 py-1.5 text-xs font-medium text-foreground/85 hover:border-azure/40">
              {text("moreNews")}
            </Link>
            <Link href={`/events?pref=${sel.prefectureId}`} className="rounded-full border border-glass-border px-3 py-1.5 text-xs font-medium text-foreground/85 hover:border-azure/40">
              {text("moreEvents")}
            </Link>
          </>
        )}
        <Link href="/weather" className="rounded-full border border-glass-border px-3 py-1.5 text-xs font-medium text-foreground/85 hover:border-azure/40">
          {text("forecast")}
        </Link>
      </div>
    </div>
  );
}

function EventDetails({ group, today }: { group: EventGroup; today: string }) {
  const { language } = useLanguage();
  const text = useInline(TEXT);
  return (
    <ul className="flex max-h-[45vh] flex-col gap-3 overflow-y-auto pr-1">
      {group.events.map((e) => (
        <li key={e.id} className="rounded-xl border border-glass-border bg-glass-bg p-3 text-sm">
          <p className="font-semibold leading-snug text-foreground">{e.title}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted">{text("when")}</dt>
            <dd className="text-foreground/90">
              {formatRange(e.current, language, today)}
              {e.startTime ? ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ""}` : ""}
              {e.typicalDates && <span className="ml-1 text-gold">({text("typical")})</span>}
            </dd>
            <dt className="text-muted">{text("where")}</dt>
            <dd className="text-foreground/90">
              {[e.venue, e.city].filter(Boolean).join(", ") || "—"}
              {e.locationApprox && <span className="block text-muted">{text("approx")}</span>}
            </dd>
            <dt className="text-muted">{text("source")}</dt>
            <dd className="text-foreground/90">{e.source.name}</dd>
          </dl>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
            {e.url && (
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-azure hover:underline">
                {text("organizerPage")} <ExternalLink size={10} aria-hidden="true" />
              </a>
            )}
            <Link href={`/events?q=${encodeURIComponent(e.title.slice(0, 60))}`} className="text-azure hover:underline">
              {text("openInEvents")} →
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

// The floating information card. On a phone it is a bottom sheet that can be
// folded down to its title so the map stays visible.
export default function MapPanel({
  selection,
  city,
  group,
  weather,
  weatherLoading,
  alerts,
  alertsOn,
  alertsLoading,
  today,
  onClose,
}: {
  selection: Selection;
  city: MapCity | null;
  group: EventGroup | null;
  weather: MapWeatherPoint | null;
  weatherLoading: boolean;
  alerts: AlertsPayload | null;
  alertsOn: boolean;
  alertsLoading: boolean;
  today: string;
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const text = useInline(TEXT);
  const [folded, setFolded] = useState(false);

  let title = "";
  let subtitle = "";
  let icon = <MapPin size={16} aria-hidden="true" />;
  if (selection.type === "city" && city) {
    title = language === "ja" ? city.nameJa : city.name;
    subtitle = language === "ja" ? city.name : city.nameJa;
    icon = <CloudSun size={16} aria-hidden="true" />;
  } else if (selection.type === "place") {
    title = language === "ja" && selection.nameJa ? selection.nameJa : selection.name;
    subtitle = selection.sub;
  } else if (group) {
    title = `${group.events.length} ${language === "ja" ? "件のイベント" : group.events.length === 1 ? "event" : "events"}`;
    subtitle = group.events[0]?.city ?? "";
    icon = <CalendarDays size={16} aria-hidden="true" />;
  }

  return (
    <aside
      aria-label={title}
      className="absolute inset-x-2 bottom-2 z-[1000] flex max-h-[52%] flex-col rounded-2xl border border-glass-border bg-panel/95 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:inset-x-auto sm:bottom-3 sm:left-3 sm:top-16 sm:max-h-none sm:w-[22.5rem]"
    >
      <header className="flex items-center gap-2.5 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-azure/15 text-azure">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold leading-tight text-foreground">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setFolded((f) => !f)}
          aria-label={folded ? text("expand") : text("collapse")}
          aria-expanded={!folded}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-glass-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure sm:hidden"
        >
          {folded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={text("close")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-glass-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      <div className={`overflow-y-auto px-4 pb-4 ${folded ? "hidden sm:block" : ""}`}>
        {selection.type === "city" && city && (
          <CityDetails city={city} weather={weather} weatherLoading={weatherLoading} alerts={alerts} alertsOn={alertsOn} alertsLoading={alertsLoading} today={today} />
        )}
        {selection.type === "place" && <PlaceDetails sel={selection} />}
        {selection.type === "events" && group && <EventDetails group={group} today={today} />}
      </div>
    </aside>
  );
}
