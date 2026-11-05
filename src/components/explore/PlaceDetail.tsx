"use client";

import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink, Info, MapPin, Navigation, Plus, Check, Sparkles, Award } from "lucide-react";
import DestinationCard from "@/components/explore/DestinationCard";
import PlaceImage from "@/components/explore/PlaceImage";
import FavoriteButton from "@/components/personalization/FavoriteButton";
import { CATEGORY_BY_ID, SEASONS, pickLabel } from "@/lib/explore/categories";
import { placeAbout, placeName, placeNameJa, prefectureLabel } from "@/lib/explore/display";
import type { Destination } from "@/lib/explore/types";
import { useTrip } from "@/lib/explore/useTrip";
import { osmEmbed } from "@/lib/events/useEvents";
import { Gallery, GettingThere } from "@/components/explore/PlaceExtras";
import { useInline, useTranslate, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const T = {
  back: { en: "Explore Japan", ja: "日本を探検" },
  about: { en: "About", ja: "概要" },
  noAbout: { en: "A description isn't available yet for this place.", ja: "この場所の説明はまだありません。" },
  source: { en: "Introduction from Wikipedia (CC BY-SA 4.0)", ja: "紹介文：Wikipedia（CC BY-SA 4.0）" },
  shownIn: { en: "Shown in", ja: "表示言語：" },
  thingsToDo: { en: "Things to do here", ja: "ここでできること" },
  typical: { en: "Typical for this kind of place — not a booking or a verified list.", ja: "この種類の場所で一般的な内容です。予約や確認済みの一覧ではありません。" },
  facts: { en: "Visit information", ja: "訪問情報" },
  bestSeason: { en: "Best season", ja: "おすすめの季節" },
  duration: { en: "Time needed", ja: "所要時間" },
  setting: { en: "Setting", ja: "屋内／屋外" },
  indoor: { en: "Indoor", ja: "屋内" },
  outdoor: { en: "Outdoor", ja: "屋外" },
  mixed: { en: "Indoor and outdoor", ja: "屋内・屋外" },
  hoursUnit: { en: "hours", ja: "時間" },
  byType: { en: "typical for this type of place", ja: "この種類の場所の目安" },
  opening: { en: "Opening hours", ja: "営業時間" },
  admission: { en: "Admission", ja: "入場料" },
  transport: { en: "Getting there", ja: "アクセス" },
  notVerified: { en: "Not verified — check the official website before you go.", ja: "未確認です。お出かけ前に公式サイトでご確認ください。" },
  transportNone: { en: "Transport details aren't in our data yet.", ja: "アクセス情報はまだ登録されていません。" },
  directions: { en: "Directions on Google Maps", ja: "Googleマップでルート検索" },
  officialSite: { en: "Official website", ja: "公式サイト" },
  noSite: { en: "No official website on record", ja: "公式サイトの登録なし" },
  location: { en: "Location", ja: "場所" },
  openMap: { en: "Open on the Japan Map", ja: "日本地図で開く" },
  nearby: { en: "Nearby places", ja: "近くのスポット" },
  tips: { en: "Before you go", ja: "お出かけ前に" },
  tipText: { en: "Opening hours, admission prices and access can change. Check the official website or the local tourism office before you travel.", ja: "営業時間・料金・アクセスは変更されることがあります。出発前に公式サイトや観光案内所でご確認ください。" },
  lastChecked: { en: "Catalogue data last refreshed", ja: "データ更新日" },
  addTrip: { en: "Add to trip", ja: "旅程に追加" },
  inTrip: { en: "In trip", ja: "旅程に追加済み" },
  photo: { en: "Photo", ja: "写真" },
  heritage: { en: "UNESCO World Heritage Site", ja: "世界遺産" },
  hidden: { en: "Hidden gem — known in few languages", ja: "穴場（掲載言語が少ない）" },
  region: { en: "Region", ja: "地方" },
} satisfies Table;

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-glass-border bg-glass-bg p-3.5">
      <span className="mt-0.5 shrink-0 text-azure">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="mt-0.5 text-sm text-foreground/90">{children}</div>
      </div>
    </div>
  );
}

export default function PlaceDetail({ place, nearby, checkedOn }: { place: Destination; nearby: Destination[]; checkedOn: string }) {
  const { language } = useLanguage();
  const t = useInline(T);
  const tr = useTranslate();
  const trip = useTrip();
  const name = placeName(place, language);
  const ja = placeNameJa(place, language);
  const about = placeAbout(place, language);
  const category = CATEGORY_BY_ID.get(place.category);
  const inTrip = trip.has(place.id);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <Link href="/explore" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-azure">
        <ArrowLeft size={15} aria-hidden="true" />
        {t("back")}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-glass-border">
          <PlaceImage image={place.image} category={place.category} alt={place.image ? name : ""} size="full" priority className="aspect-[16/10] w-full" />
          {place.image && (
            <a href={place.image.page} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 max-w-[85%] truncate rounded bg-black/60 px-2 py-1 text-[11px] text-white/85 hover:text-white">
              {t("photo")}: {place.image.author ?? "Wikimedia Commons"}
              {place.image.license ? ` · ${place.image.license}` : ""}
            </a>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-azure/15 px-2.5 py-1 font-medium text-azure">{category ? pickLabel(category.label, language) : ""}</span>
            {place.worldHeritage && (
              <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 font-medium text-gold">
                <Award size={11} aria-hidden="true" />
                {t("heritage")}
              </span>
            )}
            {place.hiddenGem && (
              <span className="flex items-center gap-1 rounded-full bg-neon-purple/15 px-2.5 py-1 font-medium text-[#c4b5fd]">
                <Sparkles size={11} aria-hidden="true" />
                {t("hidden")}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">{name}</h1>
          {ja && <p className="font-jp text-lg text-muted">{ja}</p>}
          <p className="flex items-center gap-1.5 text-sm text-foreground/80">
            <MapPin size={15} className="text-gold" aria-hidden="true" />
            {[place.city, prefectureLabel(place.prefectureId, language)].filter(Boolean).join(", ")}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => trip.toggle(place.id)}
              disabled={!inTrip && trip.full}
              aria-pressed={inTrip}
              className={`flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${inTrip ? "border-neon-purple/50 bg-neon-purple/15 text-[#c4b5fd]" : "border-glass-border text-foreground/85 hover:border-azure/40"}`}
            >
              {inTrip ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
              {inTrip ? t("inTrip") : t("addTrip")}
            </button>
            <FavoriteButton kind="place" itemKey={`wd:${place.id}`} className="!h-10 !w-10" />
            <a href={directions} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 text-sm font-semibold text-white hover:opacity-90">
              <Navigation size={14} aria-hidden="true" />
              {t("directions")}
            </a>
          </div>

          <section className="mt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("about")}</h2>
            {about ? (
              <>
                <p className={`mt-1.5 text-sm leading-relaxed text-foreground/85 ${about.language === "ja" ? "font-jp" : ""}`}>{about.text}</p>
                <p className="mt-1.5 text-[11px] text-muted">
                  {about.url ? (
                    <a href={about.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                      {t("source")} <ExternalLink size={10} aria-hidden="true" />
                    </a>
                  ) : (
                    t("source")
                  )}
                  {about.language !== language && (language === "ja" || language === "en" || about.language === "ja") ? ` · ${t("shownIn")} ${about.language === "ja" ? "日本語" : "English"}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-muted">{t("noAbout")}</p>
            )}
          </section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="things" className="rounded-2xl border border-glass-border bg-glass-bg p-4 sm:p-5">
          <h2 id="things" className="text-base font-semibold text-foreground">
            {t("thingsToDo")}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{t("typical")}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {category?.activities.map((a) => (
              <li key={a.en} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-azure" aria-hidden="true" />
                {pickLabel(a, language)}
              </li>
            ))}
          </ul>
          {place.categories.length > 1 && (
            <p className="mt-3 text-xs text-muted">{place.categories.map((c) => CATEGORY_BY_ID.get(c)).filter(Boolean).map((c) => pickLabel(c!.label, language)).join(" · ")}</p>
          )}
        </section>

        <section aria-labelledby="facts" className="flex flex-col gap-3">
          <h2 id="facts" className="sr-only">
            {t("facts")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Fact icon={<Info size={16} aria-hidden="true" />} label={t("bestSeason")}>
              {category?.seasons.length === 4 ? "—" : category?.seasons.map((s) => pickLabel(SEASONS.find((x) => x.id === s)!.label, language)).join(" · ")}
              <span className="mt-0.5 block text-[11px] text-muted">{t("byType")}</span>
            </Fact>
            <Fact icon={<Clock size={16} aria-hidden="true" />} label={t("duration")}>
              {category ? `${category.hours[0]}–${category.hours[1]} ${t("hoursUnit")}` : "—"}
              <span className="mt-0.5 block text-[11px] text-muted">{t("byType")}</span>
            </Fact>
            <Fact icon={<Clock size={16} aria-hidden="true" />} label={t("opening")}>
              <span className="text-muted">{t("notVerified")}</span>
            </Fact>
            <Fact icon={<Info size={16} aria-hidden="true" />} label={t("admission")}>
              <span className="text-muted">{t("notVerified")}</span>
            </Fact>
          </div>
          <Fact icon={<Navigation size={16} aria-hidden="true" />} label={t("transport")}>
            <GettingThere place={place} />
          </Fact>
          <Fact icon={<MapPin size={16} aria-hidden="true" />} label={tr("Address")}>
            <span className="text-foreground/90">{[place.city, prefectureLabel(place.prefectureId, language)].filter(Boolean).join(", ")}</span>
            <span className="mt-0.5 block text-[11px] text-muted">
              {place.lat.toFixed(4)}, {place.lon.toFixed(4)} · {tr("A street address isn't in our data; the map pin is exact.")}
            </span>
          </Fact>
          <Fact icon={<ExternalLink size={16} aria-hidden="true" />} label={t("officialSite")}>
            {place.website ? (
              <a href={place.website} target="_blank" rel="noopener noreferrer" className="break-all text-azure hover:underline">
                {place.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ) : (
              <span className="text-muted">{t("noSite")}</span>
            )}
          </Fact>
        </section>
      </div>

      <Gallery id={place.id} name={name} />

      <section aria-labelledby="loc" className="overflow-hidden rounded-2xl border border-glass-border">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-glass-bg px-4 py-3">
          <h2 id="loc" className="text-base font-semibold text-foreground">
            {t("location")}
          </h2>
          <Link href={`/map?place=${place.id}`} className="text-sm font-medium text-azure hover:underline">
            {t("openMap")} →
          </Link>
        </div>
        <iframe title={name} src={osmEmbed(place.lat, place.lon)} loading="lazy" className="h-72 w-full border-0" />
      </section>

      {nearby.length > 0 && (
        <section aria-labelledby="near" className="flex flex-col gap-3">
          <h2 id="near" className="text-xl font-semibold text-foreground">
            {t("nearby")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nearby.slice(0, 4).map((p) => (
              <li key={p.id}>
                <DestinationCard place={p} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="rounded-2xl border border-glass-border bg-glass-bg p-4 text-sm text-foreground/85">
        <p className="font-semibold text-foreground">{t("tips")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{t("tipText")}</p>
        <p className="mt-2 text-[11px] text-muted">
          {t("lastChecked")}: {checkedOn || "—"} · Wikidata (CC0) · Wikipedia (CC BY-SA 4.0) · Wikimedia Commons
        </p>
      </aside>
    </div>
  );
}
