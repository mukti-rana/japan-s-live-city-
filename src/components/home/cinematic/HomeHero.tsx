"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LocateFixed, MapPin, Sparkles } from "lucide-react";
import HeroAtmosphere from "@/components/home/HeroAtmosphere";
import PhotoCredit from "@/components/home/cinematic/PhotoCredit";
import { HOME_PHOTOS, type HomePhoto } from "@/lib/data/homePhotos";
import { DEFAULT_HERO_ATMOSPHERE, HERO_CITIES, findHeroCity, type HeroCityInfo } from "@/lib/data/heroCities";
import { dateFormatter } from "@/lib/i18n/datetime";
import { useTranslate, translate } from "@/lib/i18n/inline";
import { lookup } from "@/lib/i18n/translate";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { useAmbientLighting } from "@/lib/theme/ambientLighting";
import { currentSeasonJST, isNightNow } from "@/lib/weather/time";
import type { WeatherSnapshot } from "@/lib/services/weather";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

// A real, high-resolution photograph exists for these cities. Any other city gets the
// quiet gradient it always had — never another city's photo under its name.
const CITY_PHOTO: Record<string, HomePhoto> = {
  tokyo: HOME_PHOTOS.hero,
  kyoto: HOME_PHOTOS.fushimi,
  osaka: HOME_PHOTOS.dotonbori,
  nara: HOME_PHOTOS.todaiji,
  hiroshima: HOME_PHOTOS.itsukushima,
};

function greetingKey(hour: number): TranslationKey {
  if (hour < 5) return "hero.goodNight";
  if (hour < 12) return "hero.goodMorning";
  if (hour < 17) return "hero.goodAfternoon";
  return "hero.goodEvening";
}

// Japan Standard Time, to the minute.
function useJstNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const BLUR = "blur" as const;

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-black";

// The first screen. The same facts the old hero held — where you are (shared location,
// or a city you pick), the time in Japan, and the real weather there — over one large
// photograph. Nothing here is a guess: with no location and no choice it offers the
// city list and asks before using your position.
export default function HomeHero() {
  const { t, language } = useLanguage();
  const tr = useTranslate();
  const router = useRouter();
  const name = (en: string | undefined) => (en ? (lookup(en, language) ?? en) : en);
  useAmbientLighting();
  const { status, location, weather: liveWeather, requestLocation } = useLiveLocation();
  const [manualCity, setManualCity] = useState<HeroCityInfo | null>(null);
  const [manualWeather, setManualWeather] = useState<WeatherSnapshot | null>(null);
  const [question, setQuestion] = useState("");
  const now = useJstNow();

  function pickCity(city: HeroCityInfo) {
    setManualCity(city);
    setManualWeather(null);
    fetch(`/api/weather/live?lat=${city.lat}&lon=${city.lon}`)
      .then((r) => (r.ok ? (r.json() as Promise<WeatherSnapshot>) : null))
      .then((data) => setManualWeather(data))
      .catch(() => setManualWeather(null));
  }

  const isLive = status === "ready" && Boolean(liveWeather);
  const isManual = !isLive && Boolean(manualCity);
  const isLoadingLocation = status === "idle" || status === "locating";
  const needsPicker = !isLive && !isManual && !isLoadingLocation;

  const weather = isLive ? liveWeather : isManual ? manualWeather : null;
  const matchedCity = isLive ? (location?.name ? findHeroCity(location.name) : undefined) : (manualCity ?? undefined);
  const displayName = isLive ? (location?.area || location?.name || matchedCity?.name) : manualCity?.name;
  const isNight = weather ? isNightNow(weather.sunrise, weather.sunset) : true;
  const season = currentSeasonJST();

  // With no city decided yet, the page shows the Tokyo photograph as its default scene.
  const photo = matchedCity ? CITY_PHOTO[matchedCity.slug] : needsPicker || isLoadingLocation ? HOME_PHOTOS.hero : undefined;
  const atmosphere = matchedCity?.atmosphere ?? DEFAULT_HERO_ATMOSPHERE;
  const kanji = matchedCity?.nameJa ?? "日本";

  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const dateLabel = dateFormatter(language, { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "long" }).format(now);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return router.push("/ai-assistant");
    router.push(`/ai-assistant?q=${encodeURIComponent(q)}`);
  }

  return (
    <section id="top" aria-labelledby="home-h1" className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-black">
      {/* Photograph (or, for a city without one, its gradient), then weather particles, then the scrim. */}
      {photo ? (
        <div key={photo.src} className="home-fade absolute inset-0 -z-30">
          <div className="home-zoom absolute inset-0">
            <Image src={photo.src} alt={photo.alt} fill preload sizes="100vw" placeholder={BLUR} blurDataURL={photo.blur} className="object-cover object-[96%_50%] sm:object-[88%_50%] lg:object-center" />
          </div>
        </div>
      ) : (
        <div aria-hidden="true" className={`absolute inset-0 -z-30 bg-gradient-to-br ${isNight ? atmosphere.night : atmosphere.day}`} />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        <HeroAtmosphere condition={weather?.icon ?? "clear"} season={season} isNight={isNight} />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0)_26%,rgba(0,0,0,0.5)_62%,#000_100%)]" />
      {/* A side shade for the text column, wide screens only (on a phone the text sits over the lower part). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 hidden bg-[linear-gradient(90deg,rgba(0,0,0,0.6),rgba(0,0,0,0)_62%)] sm:block" />

      <div className="mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,48px)] pb-[clamp(88px,12vh,128px)] pt-32">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium uppercase tracking-[0.2em] text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.85)]">
          {isLoadingLocation ? (
            <span className="h-4 w-40 animate-pulse rounded bg-white/10" aria-hidden="true" />
          ) : displayName ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" className="text-sakura" />
                {name(displayName)}
                {matchedCity?.region ? ` · ${name(matchedCity.region)}` : ""}
              </span>
              {isLive && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/40 bg-black/60 px-2.5 py-0.5 normal-case tracking-normal text-mint backdrop-blur-sm [text-shadow:none]">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mint" />
                  {t("widget.live")}
                </span>
              )}
              {isManual && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-black/60 px-2.5 py-0.5 normal-case tracking-normal text-gold backdrop-blur-sm [text-shadow:none]">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
                  {t("hero.selected")}
                </span>
              )}
              {isManual && (
                <button
                  type="button"
                  onClick={() => {
                    setManualCity(null);
                    setManualWeather(null);
                  }}
                  className={`inline-flex min-h-8 items-center rounded-full border border-white/35 bg-black/60 px-3 normal-case tracking-normal text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-white/15 [text-shadow:none] ${ring}`}
                >
                  {t("hero.changeCity")}
                </button>
              )}
            </>
          ) : (
            <span>{t("hero.chooseCity")}</span>
          )}
        </p>

        <p aria-hidden="true" lang="ja" className="mt-3 font-[family-name:var(--font-home-kanji)] text-[clamp(88px,17vw,248px)] font-normal leading-[0.9] tracking-[-0.02em] text-white/95">
          {kanji}
        </p>

        <h1 id="home-h1" className="max-w-[16ch] font-[family-name:var(--font-home-serif)] text-[clamp(32px,4.8vw,66px)] font-normal leading-[1.04] tracking-[-0.02em] text-white">
          {tr("Japan, right now.")}
        </h1>

        <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.85)]" suppressHydrationWarning>
          <span suppressHydrationWarning>
            <b className="font-medium tabular-nums text-white">
              {String(hour).padStart(2, "0")}:{minute}
            </b>{" "}
            JST
          </span>
          <span className="hidden sm:inline" suppressHydrationWarning>
            {dateLabel}
          </span>
          {weather ? (
            <>
              <span>
                <b className="font-medium text-white">{Math.round(weather.tempC)}°</b> {translate(weather.condition, language)}
              </span>
              <span className="hidden sm:inline">
                {tr("Sunrise")} <b className="font-medium text-white">{weather.sunrise}</b> · {tr("Sunset")} <b className="font-medium text-white">{weather.sunset}</b>
              </span>
            </>
          ) : (isLive || isManual) && !isLoadingLocation ? (
            <span className="text-white/50">{isManual && !manualWeather ? "…" : ""}</span>
          ) : null}
          <span suppressHydrationWarning className="text-white/80">
            {t(greetingKey(hour))} · <span lang="ja" className="font-jp">今日もいい一日を</span>
          </span>
        </p>

        {needsPicker && (
          <div className="mt-6 max-w-[56rem]">
            <div role="group" aria-label={t("hero.chooseCity")} className="flex flex-wrap gap-2">
              {HERO_CITIES.map((city) => (
                <button
                  key={city.slug}
                  type="button"
                  onClick={() => pickCity(city)}
                  className={`min-h-9 rounded-full border border-white/20 bg-black/40 px-4 text-sm text-white/85 backdrop-blur transition-colors hover:border-white/50 hover:text-white ${ring}`}
                >
                  {name(city.name)}
                </button>
              ))}
            </div>
            {status === "prompt" && (
              <div className="mt-4 max-w-md">
                <button type="button" onClick={requestLocation} className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-azure px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90 ${ring}`}>
                  <LocateFixed size={16} aria-hidden="true" />
                  {tr("Use my location")}
                </button>
                <p className="mt-2 text-xs leading-relaxed text-white/80 [text-shadow:0_1px_10px_rgba(0,0,0,0.85)]">{tr("Your browser will ask for permission. Your position is only used to find the weather and places near you.")}</p>
              </div>
            )}
          </div>
        )}

        <div data-dock-clear className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/explore" className={`inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-black transition-colors hover:bg-white/90 ${ring}`}>
            {tr("Explore Japan")}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <form onSubmit={ask} role="search" aria-label={tr("Ask LIVE CITY AI")} className="flex h-12 w-full max-w-[22rem] items-center gap-2 rounded-xl border border-white/25 bg-black/40 pl-4 pr-1.5 backdrop-blur transition-colors focus-within:border-white/60 hover:border-white/45 sm:w-[22rem]">
            <Sparkles size={16} aria-hidden="true" className="shrink-0 text-lilac" />
            <input value={question} onChange={(e) => setQuestion(e.target.value)} aria-label={tr("Ask LIVE CITY AI")} placeholder={t("ai.askPlaceholder")} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/55" />
            <button type="submit" aria-label={t("ai.askButton")} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 ${ring}`}>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>

      {photo && <PhotoCredit photo={photo} className="absolute bottom-3 right-[clamp(16px,4vw,48px)] hidden sm:block" />}
    </section>
  );
}
