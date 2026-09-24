"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import LiveClock from "@/components/home/LiveClock";
import HeroAtmosphere from "@/components/home/HeroAtmosphere";
import HeroAIBox from "@/components/home/HeroAIBox";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { isNightNow, currentSeasonJST } from "@/lib/weather/time";
import { useAmbientLighting } from "@/lib/theme/ambientLighting";
import { HERO_CITIES, DEFAULT_HERO_ATMOSPHERE, findHeroCity, type HeroCityInfo } from "@/lib/data/heroCities";
import type { WeatherSnapshot } from "@/lib/services/weather";

export default function HeroCard() {
  const { t } = useLanguage();
  useAmbientLighting();
  const { status, location, weather: liveWeather } = useLiveLocation();
  const [manualCity, setManualCity] = useState<HeroCityInfo | null>(null);
  const [manualWeather, setManualWeather] = useState<WeatherSnapshot | null>(null);

  function pickCity(city: HeroCityInfo) {
    setManualCity(city);
    setManualWeather(null);
    fetch(`/api/weather/live?lat=${city.lat}&lon=${city.lon}`)
      .then((r) => (r.ok ? (r.json() as Promise<WeatherSnapshot>) : null))
      .then((data) => setManualWeather(data))
      .catch(() => setManualWeather(null));
  }

  function changeCity() {
    setManualCity(null);
    setManualWeather(null);
  }

  const isLive = status === "ready" && Boolean(liveWeather);
  const isManual = !isLive && Boolean(manualCity);
  const isLoadingLocation = status === "idle" || status === "locating";
  const needsPicker = !isLive && !isManual && !isLoadingLocation;

  const weather = isLive ? liveWeather : isManual ? manualWeather : null;
  // The city (not the more granular area) is what drives photo/atmosphere
  // matching, so "Tsuruhashi" in Osaka still shows Osaka's real skyline.
  const matchedCity = isLive ? (location?.name ? findHeroCity(location.name) : undefined) : (manualCity ?? undefined);

  // Headline prefers the precise, real reverse-geocoded area (e.g.
  // "Tsuruhashi") when the geocoder returns one more specific than the
  // city — falling back to the city name otherwise, never a guess.
  const displayName = isLive ? (location?.area || location?.name || matchedCity?.name) : manualCity?.name;
  const showCityContext = isLive && Boolean(location?.area);
  const subLabel = isLive && location?.countryName && location.countryName !== "Japan" ? location.countryName : undefined;

  const heroImages = matchedCity?.heroImages ?? [];
  const atmosphere = matchedCity?.atmosphere ?? DEFAULT_HERO_ATMOSPHERE;
  const isNight = weather ? isNightNow(weather.sunrise, weather.sunset) : true;
  const sceneIcon = weather?.icon ?? "clear";
  const season = currentSeasonJST();

  // Cycles through the matched city's real popular-place photos — resets
  // to the first photo whenever the city itself changes, so switching
  // cities never shows a stale index into the new city's (shorter or
  // longer) photo list.
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageIndex(0);
  }, [matchedCity?.slug]);
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = setInterval(() => {
      setImageIndex((i) => (i + 1) % heroImages.length);
    }, 8000);
    return () => clearInterval(id);
  }, [heroImages.length, matchedCity?.slug]);

  return (
    <div className="grid grid-cols-1 gap-3 overflow-hidden rounded-2xl border border-glass-border bg-panel lg:grid-cols-[1.6fr_1fr]">
      <div className="relative min-h-[240px] overflow-hidden rounded-2xl p-5 sm:p-6">
        {heroImages.length > 0 ? (
          heroImages.map((img, i) => (
            <motion.div
              key={img.src}
              className="absolute inset-0"
              animate={{ opacity: i === imageIndex ? 1 : 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            >
              <Image
                src={img.src}
                alt={`${matchedCity?.name ?? "Japan"} — popular place`}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
                style={{ objectPosition: img.position ?? "center" }}
              />
            </motion.div>
          ))
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${isNight ? atmosphere.night : atmosphere.day}`} />
        )}
        <HeroAtmosphere condition={sceneIcon} season={season} isNight={isNight} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e1a]/90 via-[#0b0e1a]/55 to-[#0b0e1a]/20" />

        <div className="dark-scene relative">
          <LiveClock timeZone="Asia/Tokyo">
            {isLoadingLocation && (
              <div className="mt-2 h-9 w-40 animate-pulse rounded-lg bg-glass-bg-strong" />
            )}

            {needsPicker && (
              <div className="mt-1">
                <p className="flex items-center gap-1.5 text-sm text-foreground/85">
                  <MapPin size={18} className="text-sakura" />
                  {t("hero.chooseCity")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {HERO_CITIES.map((city) => (
                    <button
                      key={city.slug}
                      type="button"
                      onClick={() => pickCity(city)}
                      className="rounded-full border border-glass-border bg-glass-bg px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-sakura/40 hover:text-foreground"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(isLive || isManual) && (
              <>
                <div className="mt-1 flex items-center gap-1.5">
                  <MapPin size={20} className="text-sakura" />
                  <span className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {displayName}
                  </span>
                  {isLive && (
                    <span className="flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
                      <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
                      {t("widget.live")}
                    </span>
                  )}
                  {isManual && (
                    <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                      {t("hero.selected")}
                    </span>
                  )}
                </div>
                {showCityContext ? (
                  <p className="ml-7 text-sm text-foreground/60">
                    {location?.name}
                    {matchedCity?.nameJa && <span className="font-jp"> · {matchedCity.nameJa}</span>}
                  </p>
                ) : (
                  matchedCity?.nameJa && (
                    <p className="ml-7 font-jp text-sm text-foreground/60">{matchedCity.nameJa}</p>
                  )
                )}
                {subLabel && <p className="ml-7 text-sm text-foreground/60">{subLabel}</p>}
                {isManual && (
                  <button
                    type="button"
                    onClick={changeCity}
                    className="ml-7 mt-1 text-xs text-azure hover:underline"
                  >
                    {t("hero.changeCity")}
                  </button>
                )}
              </>
            )}
          </LiveClock>

          <div className="mt-4 flex items-start gap-2">
            <span className="text-sm">🌸</span>
            <div>
              <p className="font-jp text-sm text-foreground/85">
                今日もいい一日を
              </p>
              <p className="text-xs text-muted">{t("hero.haveGreatDay")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <HeroAIBox />
      </div>
    </div>
  );
}
