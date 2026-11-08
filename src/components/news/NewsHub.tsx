"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Search, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import NewsCard from "@/components/news/NewsCard";
import NewsModal from "@/components/news/NewsModal";
import BreakingStrip from "@/components/news/BreakingStrip";
import LocalSection from "@/components/news/LocalSection";
import NewsFilters from "@/components/news/NewsFilters";
import PlacePicker from "@/components/news/PlacePicker";
import { CardSkeleton, FeaturedSkeleton } from "@/components/news/NewsSkeleton";
import { CATEGORIES } from "@/lib/news/categories";
import { DEFAULT_FILTERS, activeFilterCount, gridParams, pageQuery, type HubFilters } from "@/lib/news/hubFilters";
import { PREFECTURES } from "@/lib/news/places";
import { SOURCE_OPTIONS } from "@/lib/news/sources";
import { timeAgo, toQueryString, useNewsFeed, useNewsPlace, useResolvedImages, type NewsParams } from "@/lib/news/useNews";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { NewsItem, NewsResult } from "@/lib/news/query";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import { localize, useTranslate } from "@/lib/i18n/inline";

const STALE_AFTER_MS = 30 * 60 * 1000;

interface Loaded {
  key: string;
  pages: NewsResult[];
  failed?: boolean;
}

export default function NewsHub({
  initialFilters,
  initialResult,
}: {
  initialFilters: HubFilters;
  initialResult: NewsResult | null;
}) {
  const { t, language } = useLanguage();
  const tr = useTranslate();
  const placeInfo = useNewsPlace();
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const waitingForPlace = filters.loc === "near" && !placeInfo.place;
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

  // The newest story that has a picture leads the page. If none of the first
  // few has one (and none is still waiting for its picture), the newest story
  // leads anyway, in the text-first layout.
  const topSix = items.slice(0, 6);
  const featured = topSix.find((i) => i.imageUrl) ?? (topSix.some((i) => i.imagePending) ? null : items[0] ?? null);
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

  const topicLabel = (id: string) => t(CATEGORIES.find((c) => c.id === id)!.labelKey);
  const prefLabel = (id: string) => {
    const p = PREFECTURES.find((x) => x.id === id);
    return p ? localize(p.en, p.ja, language) : id;
  };
  const sourceName = (id: string) => SOURCE_OPTIONS.find((s) => s.id === id)?.name ?? id;
  const rangeLabel = filters.range === "custom" ? [filters.from, filters.to].filter(Boolean).join(" → ") : filters.range === "today" ? tr("Today") : tr("This week");

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.topic !== "all") chips.push({ key: "topic", label: topicLabel(filters.topic), clear: () => update({ topic: "all" }) });
  if (filters.loc) chips.push({ key: "loc", label: `${t("news.hub.location")}: ${filters.loc === "near" ? (placeInfo.place ?? tr("Near Me")) : prefLabel(filters.loc)}`, clear: () => update({ loc: "" }) });
  if (filters.src) chips.push({ key: "src", label: `${t("news.hub.source")}: ${sourceName(filters.src)}`, clear: () => update({ src: "" }) });
  if (filters.lang) chips.push({ key: "lang", label: `${t("news.hub.language")}: ${t(`news.lang.${filters.lang}` as TranslationKey)}`, clear: () => update({ lang: "" }) });
  if (filters.range) chips.push({ key: "range", label: rangeLabel, clear: () => update({ range: "", from: "", to: "" }) });
  if (filters.video) chips.push({ key: "video", label: t("news.hub.videoNews"), clear: () => update({ video: false }) });
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, clear: () => { setQInput(""); update({ q: "" }); } });

  const active = activeFilterCount(filters);
  const fetchedAt = lastPage?.fetchedAt;
  const stale = lastPage ? lastPage.ageMs > STALE_AFTER_MS : false;
  const downSources = lastPage?.sources.filter((s) => !s.ok) ?? [];
  const showHazardNote = filters.topic === "weather" || filters.topic === "earthquake";
  // The local row and the breaking bar belong to the plain, unfiltered view.
  const plainView = active === 0 && !filters.q;

  // First page = "Latest news"; everything loaded after it = "Continue discovering".
  const firstIds = new Set(pages[0]?.items.map((i) => i.id) ?? []);
  const later = rest.filter((i) => !firstIds.has(i.id));
  const first = rest.filter((i) => firstIds.has(i.id));

  const scopes: { id: HubFilters["scope"]; label: string }[] = [
    { id: "all", label: tr("All News") },
    { id: "japan", label: tr("Japan") },
    { id: "world", label: tr("World") },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Search and the one Filters button */}
      <div className="flex items-center gap-2.5">
        <div className="relative min-w-0 flex-1">
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
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          className="relative flex h-11 shrink-0 items-center gap-2 rounded-xl border border-azure/40 bg-azure/10 px-4 text-sm font-semibold text-azure transition-colors hover:bg-azure/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          {tr("Filters")}
          {active > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-purple px-1 text-[10px] font-bold text-white" aria-label={tr("{n} filters applied").replace("{n}", String(active))}>
              {active}
            </span>
          )}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="-mt-2 flex flex-wrap items-center gap-2" aria-live="polite">
          {chips.map((chip) => (
            <button key={chip.key} type="button" onClick={chip.clear} className="flex items-center gap-1 rounded-full bg-azure/15 px-2.5 py-1 text-[11px] font-medium text-azure hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              {chip.label}
              <X size={11} aria-hidden="true" />
              <span className="sr-only">{tr("Remove filter")}</span>
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-[11px] font-medium text-muted underline-offset-2 hover:text-foreground hover:underline">
            {tr("Reset filters")}
          </button>
        </div>
      )}

      {plainView && <BreakingStrip onOpen={setOpenItem} />}

      {/* A — Latest near you */}
      {plainView && <LocalSection placeInfo={placeInfo} onOpen={setOpenItem} onSeeAll={() => update({ loc: "near" })} />}

      {filters.loc === "near" && (
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

      {/* B — Latest news */}
      <section aria-label={tr("Latest news")} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{filters.video ? t("news.hub.videoNews") : tr("Latest news")}</h2>
            {lastPage && !loading && (
              <p className="mt-0.5 text-[11px] text-muted" aria-live="polite">
                {lastPage.total} {t("news.hub.stories")}
                {fetchedAt ? ` · ${tr("Checked")} ${timeAgo(new Date(fetchedAt).toISOString(), language)}` : ""}
                {stale ? ` · ${t("news.hub.stale")}` : ""}
              </p>
            )}
          </div>
          <div role="group" aria-label={tr("Show")} className="inline-flex rounded-2xl border border-glass-border bg-glass-bg p-1">
            {scopes.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={filters.scope === s.id}
                onClick={() => update({ scope: s.id })}
                className={`min-h-9 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${filters.scope === s.id ? "bg-gradient-to-r from-azure/25 to-neon-purple/25 text-foreground shadow-[inset_0_0_0_1px_rgba(77,163,255,0.35)]" : "text-muted hover:text-foreground"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

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
                {tr("Reset filters")}
              </button>
            )}
          </div>
        ) : (
          <>
            {featured && <NewsCard item={featured} variant="featured" onOpen={setOpenItem} showLevel={filters.loc === "near"} priority />}

            {videos.data && videos.data.items.length > 0 && (
              <section aria-label={t("news.hub.videoNews")} className="flex flex-col gap-2.5">
                <h3 className="text-sm font-semibold text-foreground">▶ {t("news.hub.videoNews")}</h3>
                <ul className="-mx-3 flex snap-x scroll-pl-3 gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
                  {videos.data.items.map((v) => (
                    <li key={v.id} className="w-60 shrink-0 snap-start sm:w-64">
                      <NewsCard item={v} variant="card" onOpen={setOpenItem} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {first.map((item) => (
                <NewsCard key={item.id} item={item} onOpen={setOpenItem} showLevel={filters.loc === "near"} />
              ))}
            </div>

            {/* C — Continue discovering */}
            {(later.length > 0 || lastPage?.nextOffset) && (
              <div className="flex flex-col gap-4 border-t border-glass-border pt-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{tr("Continue discovering")}</h2>
                  <p className="mt-0.5 text-xs text-muted">{tr("More stories from other prefectures, major cities and the world, newest first. Each story appears once.")}</p>
                </div>
                {later.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {later.map((item) => (
                      <NewsCard key={item.id} item={item} onOpen={setOpenItem} showLevel={filters.loc === "near"} />
                    ))}
                  </div>
                )}
                {loadingMore && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label={t("news.hub.loadingMore")}>
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                  </div>
                )}
              </div>
            )}

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
              ) : (
                later.length > 0 && <p className="text-xs text-muted">{tr("You're all caught up.")}</p>
              )}
              {moreFailed && (
                <p role="alert" className="text-xs text-sakura">
                  {t("news.hub.errorTitle")}
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {downSources.length > 0 && (
        <p className="text-[11px] text-sakura">
          {t("news.hub.sourcesDown")}: {downSources.map((s) => s.name).join(", ")}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-muted">{t("news.hub.credit")}</p>

      <NewsFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onChange={update} onReset={clearAll} placeInfo={placeInfo} />
      <NewsModal item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  );
}
