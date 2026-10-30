"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
import NewsCard from "@/components/news/NewsCard";
import NewsModal from "@/components/news/NewsModal";
import PlacePicker from "@/components/news/PlacePicker";
import { CardSkeleton, FeaturedSkeleton } from "@/components/news/NewsSkeleton";
import { CATEGORIES, type CategoryId } from "@/lib/news/categories";
import { DEFAULT_CATEGORY, DEFAULT_FILTERS, gridParams, pageQuery, type HubFilters } from "@/lib/news/hubFilters";
import { PREFECTURES } from "@/lib/news/places";
import { SOURCE_OPTIONS } from "@/lib/news/sources";
import { timeAgo, toQueryString, useNewsFeed, useNewsPlace, useResolvedImages, type NewsParams } from "@/lib/news/useNews";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { NewsItem, NewsResult } from "@/lib/news/query";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

const STALE_AFTER_MS = 30 * 60 * 1000;

interface Loaded {
  key: string;
  pages: NewsResult[];
  failed?: boolean;
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-glass-border bg-panel px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
      >
        {children}
      </select>
    </label>
  );
}

export default function NewsHub({
  initialFilters,
  initialResult,
}: {
  initialFilters: HubFilters;
  initialResult: NewsResult | null;
}) {
  const { t, language } = useLanguage();
  const placeInfo = useNewsPlace();
  const [filters, setFilters] = useState<HubFilters>(initialFilters);
  const [qInput, setQInput] = useState(initialFilters.q);
  const [openItem, setOpenItem] = useState<NewsItem | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const initialKey = initialResult ? toQueryString(gridParams(initialFilters, null)) : null;
  const [loaded, setLoaded] = useState<Loaded | null>(
    initialResult && initialKey ? { key: initialKey, pages: [initialResult] } : null,
  );
  const loadedKeyRef = useRef<string | null>(initialKey);

  // Local news needs a place; every other category can load straight away.
  const waitingForPlace = filters.cat === "local" && !placeInfo.place;
  const baseParams = useMemo(() => gridParams(filters, placeInfo.place), [filters, placeInfo.place]);
  const baseKey = waitingForPlace ? null : toQueryString(baseParams);

  // Search is applied half a second after typing stops.
  useEffect(() => {
    const id = setTimeout(() => {
      const next = qInput.trim();
      setFilters((f) => (f.q === next ? f : { ...f, q: next }));
    }, 400);
    return () => clearTimeout(id);
  }, [qInput]);

  // Keep the address bar in step with the filters, so a page can be shared,
  // refreshed or returned to without losing the view.
  useEffect(() => {
    const qs = pageQuery(filters);
    window.history.replaceState(null, "", qs ? `/news?${qs}` : "/news");
  }, [filters]);

  useEffect(() => {
    if (baseKey === null || loadedKeyRef.current === baseKey) return;
    const controller = new AbortController();
    fetch(`/api/news?${baseKey}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<NewsResult>) : Promise.reject(new Error("failed"))))
      .then((result) => {
        loadedKeyRef.current = baseKey;
        setMoreFailed(false);
        setLoaded({ key: baseKey, pages: [result] });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setLoaded({ key: baseKey, pages: [], failed: true });
      });
    return () => controller.abort();
  }, [baseKey, attempt]);

  const current = loaded && loaded.key === baseKey ? loaded : null;
  const loading = baseKey !== null && !current;
  const failed = Boolean(current?.failed);
  const pages = useMemo(() => current?.pages ?? [], [current]);
  const lastPage = pages[pages.length - 1];

  const rawItems = useMemo(() => {
    const seen = new Set<string>();
    return pages.flatMap((p) => p.items).filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  }, [pages]);
  const items = useResolvedImages(rawItems);

  // The newest story that has a picture leads the page.
  const featured = items.slice(0, 6).find((i) => i.imageUrl) ?? null;
  const rest = featured ? items.filter((i) => i.id !== featured.id) : items;

  const videoParams: NewsParams | null =
    filters.video || waitingForPlace
      ? null
      : { ...baseParams, video: 1, limit: 8, offset: undefined };
  const videos = useNewsFeed(videoParams);

  const loadMore = useCallback(async () => {
    if (!lastPage?.nextOffset || loadingMore || baseKey === null) return;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const res = await fetch(`/api/news?${toQueryString({ ...baseParams, offset: lastPage.nextOffset })}`);
      if (!res.ok) throw new Error("failed");
      const result = (await res.json()) as NewsResult;
      setLoaded((l) => (l && l.key === baseKey ? { ...l, pages: [...l.pages, result] } : l));
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [lastPage, loadingMore, baseKey, baseParams]);

  // Scrolling to the end loads the next page; the button does the same for
  // keyboards and anyone who prefers to click.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMoreRef.current();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lastPage?.nextOffset]);

  function update(patch: Partial<HubFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function clearAll() {
    setQInput("");
    setFilters(DEFAULT_FILTERS);
  }

  const categoryLabel = (id: CategoryId) => t(CATEGORIES.find((c) => c.id === id)!.labelKey);
  const prefLabel = (id: string) => {
    const p = PREFECTURES.find((x) => x.id === id);
    return p ? (language === "ja" ? p.ja : p.en) : id;
  };
  const sourceName = (id: string) => SOURCE_OPTIONS.find((s) => s.id === id)?.name ?? id;

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.cat !== DEFAULT_CATEGORY) chips.push({ key: "cat", label: categoryLabel(filters.cat), clear: () => update({ cat: DEFAULT_CATEGORY }) });
  if (filters.pref) chips.push({ key: "pref", label: `${t("news.hub.location")}: ${prefLabel(filters.pref)}`, clear: () => update({ pref: "" }) });
  if (filters.src) chips.push({ key: "src", label: `${t("news.hub.source")}: ${sourceName(filters.src)}`, clear: () => update({ src: "" }) });
  if (filters.lang) chips.push({ key: "lang", label: `${t("news.hub.language")}: ${t(`news.lang.${filters.lang}` as TranslationKey)}`, clear: () => update({ lang: "" }) });
  if (filters.range) chips.push({ key: "range", label: t(`news.range.${filters.range}` as TranslationKey), clear: () => update({ range: "" }) });
  if (filters.video) chips.push({ key: "video", label: t("news.hub.videoNews"), clear: () => update({ video: false }) });
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, clear: () => { setQInput(""); update({ q: "" }); } });

  const fetchedAt = lastPage?.fetchedAt;
  const stale = lastPage ? lastPage.ageMs > STALE_AFTER_MS : false;
  const downSources = lastPage?.sources.filter((s) => !s.ok) ?? [];
  const showHazardNote = filters.cat === "weather" || filters.cat === "earthquake";

  return (
    <div className="flex flex-col gap-5">
      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t("news.hub.search")}
            aria-label={t("news.hub.search")}
            className="h-11 w-full rounded-xl border border-glass-border bg-glass-bg pl-10 pr-4 text-base text-foreground outline-none placeholder:text-muted focus:border-azure/50 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <Select label={t("news.hub.location")} value={filters.pref} onChange={(v) => update({ pref: v })}>
            <option value="">{t("news.hub.anyLocation")}</option>
            {PREFECTURES.map((p) => (
              <option key={p.id} value={p.id}>
                {language === "ja" ? p.ja : p.en}
              </option>
            ))}
          </Select>
          <Select label={t("news.hub.source")} value={filters.src} onChange={(v) => update({ src: v })}>
            <option value="">{t("news.hub.allSources")}</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select label={t("news.hub.language")} value={filters.lang} onChange={(v) => update({ lang: v })}>
            <option value="">{t("news.hub.allLanguages")}</option>
            <option value="en">{t("news.lang.en")}</option>
            <option value="ja">{t("news.lang.ja")}</option>
          </Select>
          <Select label={t("news.hub.date")} value={filters.range} onChange={(v) => update({ range: v })}>
            <option value="">{t("news.hub.anyTime")}</option>
            <option value="24h">{t("news.range.24h")}</option>
            <option value="7d">{t("news.range.7d")}</option>
            <option value="30d">{t("news.range.30d")}</option>
          </Select>
        </div>

        {/* Categories */}
        <div
          role="group"
          aria-label="Categories"
          className="-mx-3 flex snap-x scroll-pl-3 gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORIES.map((c) => {
            const active = filters.cat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => update({ cat: c.id })}
                className={`shrink-0 snap-start whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
                  active
                    ? "border-azure/50 bg-azure/20 text-azure"
                    : "border-glass-border bg-glass-bg text-foreground/75 hover:border-white/25 hover:text-foreground"
                }`}
              >
                {t(c.labelKey)}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={filters.video}
            onClick={() => update({ video: !filters.video })}
            className={`shrink-0 snap-start whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
              filters.video
                ? "border-sakura/50 bg-sakura/20 text-sakura"
                : "border-glass-border bg-glass-bg text-foreground/75 hover:border-white/25 hover:text-foreground"
            }`}
          >
            ▶ {t("news.hub.videoNews")}
          </button>
        </div>
      </div>

      {filters.cat === "local" && (
        <div className="rounded-2xl border border-glass-border bg-glass-bg p-4">
          <PlacePicker current={placeInfo} />
        </div>
      )}

      {showHazardNote && (
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

      {/* What's selected, and how many results */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-live="polite">
        {chips.length > 0 && <span className="text-[11px] font-medium text-muted">{t("news.hub.showing")}:</span>}
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.clear}
            className="flex items-center gap-1 rounded-full bg-azure/15 px-2.5 py-1 text-[11px] font-medium text-azure hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
          >
            {chip.label}
            <X size={11} aria-hidden="true" />
          </button>
        ))}
        {chips.length > 0 && (
          <button type="button" onClick={clearAll} className="text-[11px] font-medium text-muted underline-offset-2 hover:text-foreground hover:underline">
            {t("news.hub.clear")}
          </button>
        )}
        {lastPage && !loading && (
          <span className="ml-auto text-[11px] text-muted">
            {lastPage.total} {t("news.hub.stories")}
            {fetchedAt ? ` · ${t("news.hub.updated")} ${timeAgo(new Date(fetchedAt).toISOString(), language)}` : ""}
            {stale ? ` · ${t("news.hub.stale")}` : ""}
          </span>
        )}
      </div>

      {/* Results */}
      {waitingForPlace ? (
        placeInfo.locating ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-glass-border p-6 text-center text-sm text-muted">{t("news.place.needed")}</p>
        )
      ) : loading ? (
        <div className="flex flex-col gap-4" role="status" aria-label={t("news.hub.loadingMore")}>
          <FeaturedSkeleton />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : failed ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-sakura/25 bg-sakura/5 p-8 text-center">
          <AlertTriangle className="text-sakura" size={26} aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">{t("news.hub.errorTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("news.hub.errorHelp")}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadedKeyRef.current = null;
              setLoaded(null);
              setAttempt((n) => n + 1);
            }}
            className="flex items-center gap-1.5 rounded-full bg-sakura/20 px-4 py-2 text-sm font-semibold text-sakura hover:bg-sakura/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {t("news.hub.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-glass-border p-8 text-center">
          <p className="font-semibold text-foreground">{t("news.hub.emptyTitle")}</p>
          <p className="text-sm text-muted">{t("news.hub.emptyHelp")}</p>
          {chips.length > 0 && (
            <button type="button" onClick={clearAll} className="mt-2 rounded-full bg-azure/15 px-4 py-2 text-sm font-semibold text-azure hover:bg-azure/25">
              {t("news.hub.clear")}
            </button>
          )}
        </div>
      ) : (
        <>
          {featured && <NewsCard item={featured} variant="featured" onOpen={setOpenItem} showLevel={filters.cat === "local"} priority />}

          {videos.data && videos.data.items.length > 0 && (
            <section aria-label={t("news.hub.videoNews")} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">▶ {t("news.hub.videoNews")}</h2>
              <ul className="-mx-3 flex snap-x scroll-pl-3 gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
                {videos.data.items.map((v) => (
                  <li key={v.id} className="w-64 shrink-0 snap-start sm:w-72">
                    <NewsCard item={v} variant="card" onOpen={setOpenItem} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((item) => (
              <NewsCard key={item.id} item={item} onOpen={setOpenItem} showLevel={filters.cat === "local"} />
            ))}
          </div>

          <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-2">
            {lastPage?.nextOffset ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-full border border-glass-border bg-glass-bg px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60"
              >
                {loadingMore ? t("news.hub.loadingMore") : t("news.hub.loadMore")}
              </button>
            ) : null}
            {moreFailed && (
              <p role="alert" className="text-xs text-sakura">
                {t("news.hub.errorTitle")}
              </p>
            )}
          </div>
        </>
      )}

      {downSources.length > 0 && (
        <p className="text-[11px] text-sakura">
          {t("news.hub.sourcesDown")}: {downSources.map((s) => s.name).join(", ")}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-muted">{t("news.hub.credit")}</p>

      <NewsModal item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  );
}
