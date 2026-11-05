"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Map as MapIcon, Route, Trash2, X as XIcon } from "lucide-react";
import PlaceImage from "@/components/explore/PlaceImage";
import { CATEGORY_BY_ID } from "@/lib/explore/categories";
import { formatDistance, placeName, prefectureLabel } from "@/lib/explore/display";
import type { Destination, ExploreResult } from "@/lib/explore/types";
import { useTrip } from "@/lib/explore/useTrip";
import { haversineKm } from "@/lib/events/geo";
import { useInline, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const T = {
  title: { en: "My trip", ja: "マイ旅程" },
  back: { en: "Explore Japan", ja: "日本を探検" },
  intro: { en: "Add places from Explore Japan, then arrange them so the day doesn't zig-zag. Your list is kept on this device.", ja: "「日本を探検」で場所を追加し、無駄の少ない順に並べます。リストはこの端末に保存されます。" },
  empty: { en: "Your trip is empty. Add places with “Add to trip” on any destination.", ja: "旅程はまだ空です。各スポットの「旅程に追加」から追加してください。" },
  browse: { en: "Browse places", ja: "場所を探す" },
  order: { en: "Suggested order", ja: "おすすめの順番" },
  orderNote: { en: "Ordered to keep the distance between stops short, starting from the first place you added.", ja: "最初に追加した場所から、移動距離が短くなる順に並べています。" },
  estimate: { en: "Distances are straight-line estimates, not routes. Real travel time depends on the trains, roads and timetables — check a route planner before you go.", ja: "距離は直線距離の目安で、経路ではありません。実際の所要時間は電車・道路・時刻表により異なります。出発前に経路検索でご確認ください。" },
  legKm: { en: "straight-line", ja: "直線距離" },
  total: { en: "Total between stops", ja: "地点間の合計" },
  warnFar: { en: "These stops are far apart for one day. Consider splitting the trip over several days.", ja: "1日で回るには地点が離れています。数日に分けることをおすすめします。" },
  warnMany: { en: "That's a lot of stops for one day — most people manage about 3–5.", ja: "1日の訪問先としては多めです。3〜5か所が目安です。" },
  remove: { en: "Remove", ja: "削除" },
  clear: { en: "Clear trip", ja: "旅程を空にする" },
  loading: { en: "Loading your places…", ja: "読み込み中…" },
  failed: { en: "Your places couldn't be loaded.", ja: "場所を読み込めませんでした。" },
  openMap: { en: "See on the map", ja: "地図で見る" },
  directions: { en: "Route on Google Maps", ja: "Googleマップで経路を見る" },
  saveNote: { en: "Saved on this device. Sign in and use ♥ to keep favourites with your account.", ja: "この端末に保存されます。♥でお気に入りをアカウントに保存できます。" },
} satisfies Table;

// Greedy nearest-neighbour ordering from the first stop. Good enough to avoid
// obvious zig-zags; it is not an optimal route and uses straight-line distance.
function order(places: Destination[]): Destination[] {
  if (places.length <= 2) return places;
  const left = places.slice(1);
  const out = [places[0]];
  while (left.length) {
    const last = out[out.length - 1];
    let best = 0;
    let bestD = Infinity;
    left.forEach((p, i) => {
      const d = haversineKm(last.lat, last.lon, p.lat, p.lon);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    out.push(left.splice(best, 1)[0]);
  }
  return out;
}

export default function TripBuilder() {
  const { language } = useLanguage();
  const t = useInline(T);
  const trip = useTrip();
  const [loaded, setLoaded] = useState<{ key: string; items: Destination[]; failed?: boolean } | null>(null);
  const key = trip.ids.join(",");

  useEffect(() => {
    if (!key) return;
    const c = new AbortController();
    // Each id is looked up through the catalogue search by its stored id list.
    fetch(`/api/explore/places?ids=${encodeURIComponent(key)}`, { signal: c.signal })
      .then((r) => (r.ok ? (r.json() as Promise<ExploreResult>) : Promise.reject(new Error("failed"))))
      .then((d) => setLoaded({ key, items: d.items }))
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name !== "AbortError") setLoaded({ key, items: [], failed: true });
      });
    return () => c.abort();
  }, [key]);

  const current = loaded && loaded.key === key ? loaded : null;
  const places = useMemo(() => {
    if (!current) return [];
    const byId = new Map(current.items.map((p) => [p.id, p]));
    return order(trip.ids.map((id) => byId.get(id)).filter((p): p is Destination => Boolean(p)));
  }, [current, trip.ids]);

  const legs = places.slice(1).map((p, i) => haversineKm(places[i].lat, places[i].lon, p.lat, p.lon));
  const total = legs.reduce((a, b) => a + b, 0);
  const tooFar = legs.some((d) => d > 60);

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      <Link href="/explore" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-azure">
        <ArrowLeft size={15} aria-hidden="true" />
        {t("back")}
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">{t("intro")}</p>
      </header>

      {trip.ids.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-glass-border p-10 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
          <Link href="/explore" className="rounded-full bg-azure/15 px-4 py-2 text-sm font-semibold text-azure hover:bg-azure/25">
            {t("browse")}
          </Link>
        </div>
      ) : !current ? (
        <p role="status" className="text-sm text-muted">
          {t("loading")}
        </p>
      ) : current.failed ? (
        <p role="alert" className="text-sm text-sakura">
          {t("failed")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("order")}</h2>
              <p className="text-xs text-muted">{t("orderNote")}</p>
            </div>
            <button type="button" onClick={trip.clear} className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-sakura">
              <Trash2 size={13} aria-hidden="true" />
              {t("clear")}
            </button>
          </div>

          {(tooFar || places.length > 6) && (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs text-foreground/90">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
              {tooFar ? t("warnFar") : t("warnMany")}
            </p>
          )}

          <ol className="flex flex-col">
            {places.map((p, i) => {
              const cat = CATEGORY_BY_ID.get(p.category);
              return (
                <li key={p.id}>
                  {i > 0 && (
                    <div className="ml-6 flex items-center gap-2 border-l border-dashed border-azure/40 py-2 pl-5 text-xs text-muted">
                      <Route size={13} className="text-azure" aria-hidden="true" />
                      ≈ {formatDistance(legs[i - 1])} {t("legKm")}
                    </div>
                  )}
                  <div className="flex gap-3 rounded-2xl border border-glass-border bg-glass-bg p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-azure to-neon-purple text-sm font-bold text-white">{i + 1}</span>
                    <PlaceImage image={p.image} category={p.category} alt="" className="h-16 w-24 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/explore/${p.id}`} className="block truncate font-semibold text-foreground hover:text-azure">
                        {placeName(p, language)}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        {[p.city, prefectureLabel(p.prefectureId, language)].filter(Boolean).join(", ")} · {cat?.label.en}
                      </p>
                    </div>
                    <button type="button" onClick={() => trip.remove(p.id)} aria-label={`${t("remove")}: ${placeName(p, language)}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-glass-bg-strong hover:text-sakura">
                      <XIcon size={15} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-glass-border bg-glass-bg p-4 text-sm">
            <span className="text-foreground/85">
              {t("total")}: <strong className="text-foreground">≈ {formatDistance(total)}</strong>
            </span>
            <Link href={`/map?trip=${trip.ids.join(",")}`} className="ml-auto flex items-center gap-1.5 rounded-full bg-azure/15 px-3.5 py-1.5 text-xs font-semibold text-azure hover:bg-azure/25">
              <MapIcon size={13} aria-hidden="true" />
              {t("openMap")}
            </Link>
            {places.length >= 2 && (
              <a
                href={`https://www.google.com/maps/dir/${places.map((p) => `${p.lat},${p.lon}`).join("/")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-glass-border px-3.5 py-1.5 text-xs font-medium text-foreground/85 hover:border-azure/40"
              >
                {t("directions")}
                <ArrowRight size={12} aria-hidden="true" />
              </a>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            {t("estimate")} {t("saveNote")}
          </p>
        </>
      )}
    </div>
  );
}
