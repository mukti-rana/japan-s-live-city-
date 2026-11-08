"use client";

import { useEffect, useRef } from "react";
import { LocateFixed, X } from "lucide-react";
import { CATEGORIES } from "@/lib/news/categories";
import { TOPIC_FILTERS, type HubFilters } from "@/lib/news/hubFilters";
import { PREFECTURES } from "@/lib/news/places";
import { SOURCE_OPTIONS } from "@/lib/news/sources";
import type { NewsPlace } from "@/lib/news/useNews";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { known, localize, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const MAIN_CITIES = ["tokyo", "osaka", "kyoto"];

const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-azure/50 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/80 hover:border-white/25 hover:text-foreground"
  }`;
const field = "h-10 w-full rounded-xl border border-glass-border bg-panel px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5 border-t border-glass-border pt-4 first:border-0 first:pt-0">
      <legend className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

// The one place all the narrowing choices live. It opens from a single
// "Filters" button and every choice applies straight away.
export default function NewsFilters({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  placeInfo,
}: {
  open: boolean;
  onClose: () => void;
  filters: HubFilters;
  onChange: (patch: Partial<HubFilters>) => void;
  onReset: () => void;
  placeInfo: NewsPlace;
}) {
  const { t, language } = useLanguage();
  const tr = useTranslate();
  const live = useLiveLocation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const otherPrefs = PREFECTURES.filter((p) => !MAIN_CITIES.includes(p.id));
  const nearLabel = placeInfo.place ? `${known(placeInfo.place, language)} · ${placeInfo.source === "selected" ? t("news.place.selected") : t("news.place.fromLocation")}` : null;
  const asksLocation = live.status === "prompt";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-label={tr("Filters")}>
      <button type="button" aria-label={tr("Close")} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" tabIndex={-1} />
      <div className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border border-glass-border bg-panel shadow-2xl sm:max-h-none sm:w-[26rem] sm:rounded-none sm:rounded-l-3xl">
        <div className="flex items-center justify-between border-b border-glass-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{tr("Filters")}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={tr("Close")} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-glass-bg-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          <Group title={t("news.hub.location")}>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={filters.loc === ""} onClick={() => onChange({ loc: "" })} className={chip(filters.loc === "")}>
                {t("news.hub.anyLocation")}
              </button>
              <button
                type="button"
                aria-pressed={filters.loc === "near"}
                onClick={() => {
                  onChange({ loc: "near" });
                  if (!placeInfo.place && asksLocation) live.requestLocation();
                }}
                className={`flex items-center gap-1.5 ${chip(filters.loc === "near")}`}
              >
                <LocateFixed size={13} aria-hidden="true" />
                {tr("Near Me")}
              </button>
              {MAIN_CITIES.map((id) => {
                const p = PREFECTURES.find((x) => x.id === id)!;
                return (
                  <button key={id} type="button" aria-pressed={filters.loc === id} onClick={() => onChange({ loc: id })} className={chip(filters.loc === id)}>
                    {localize(p.en, p.ja, language)}
                  </button>
                );
              })}
            </div>
            <select aria-label={tr("Other prefectures")} className={field} value={otherPrefs.some((p) => p.id === filters.loc) ? filters.loc : ""} onChange={(e) => e.target.value && onChange({ loc: e.target.value })}>
              <option value="">{tr("Other prefectures")}…</option>
              {otherPrefs.map((p) => (
                <option key={p.id} value={p.id}>
                  {localize(p.en, p.ja, language)}
                </option>
              ))}
            </select>
            {filters.loc === "near" && (
              <p className="text-[11px] leading-relaxed text-muted">
                {nearLabel
                  ? tr("Near Me uses {place}.").replace("{place}", nearLabel)
                  : asksLocation
                    ? tr("Your browser will ask for permission. Your position is only used to find your city. Or pick a city above.")
                    : tr("We couldn't get your location. Pick a city above.")}
              </p>
            )}
          </Group>

          <Group title={t("news.hub.source")}>
            <select aria-label={t("news.hub.source")} className={field} value={filters.src} onChange={(e) => onChange({ src: e.target.value })}>
              <option value="">{t("news.hub.allSources")}</option>
              {SOURCE_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Group>

          <Group title={t("news.hub.language")}>
            <div className="flex flex-wrap gap-2">
              {[
                ["", t("news.hub.allLanguages")],
                ["ja", t("news.lang.ja")],
                ["en", t("news.lang.en")],
              ].map(([v, label]) => (
                <button key={v} type="button" aria-pressed={filters.lang === v} onClick={() => onChange({ lang: v })} className={chip(filters.lang === v)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted">{tr("Our news sources publish in Japanese and English only; stories are shown in their original language.")}</p>
          </Group>

          <Group title={t("news.hub.date")}>
            <div className="flex flex-wrap gap-2">
              {[
                ["", tr("Latest")],
                ["today", tr("Today")],
                ["7d", tr("This week")],
                ["custom", tr("Custom range")],
              ].map(([v, label]) => (
                <button key={v} type="button" aria-pressed={filters.range === v} onClick={() => onChange({ range: v })} className={chip(filters.range === v)}>
                  {label}
                </button>
              ))}
            </div>
            {filters.range === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[11px] text-muted">
                  {tr("From")}
                  <input type="date" className={field} value={filters.from} max={filters.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted">
                  {tr("To")}
                  <input type="date" className={field} value={filters.to} min={filters.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />
                </label>
              </div>
            )}
          </Group>

          <Group title={tr("Categories")}>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={filters.topic === "all"} onClick={() => onChange({ topic: "all" })} className={chip(filters.topic === "all")}>
                {tr("All categories")}
              </button>
              {TOPIC_FILTERS.map((id) => {
                const c = CATEGORIES.find((x) => x.id === id)!;
                return (
                  <button key={id} type="button" aria-pressed={filters.topic === id} onClick={() => onChange({ topic: id })} className={chip(filters.topic === id)}>
                    {t(c.labelKey)}
                  </button>
                );
              })}
            </div>
          </Group>

          <Group title={tr("Media")}>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!filters.video} onClick={() => onChange({ video: false })} className={chip(!filters.video)}>
                {t("news.cat.all")}
              </button>
              <button type="button" aria-pressed={filters.video} onClick={() => onChange({ video: true })} className={chip(filters.video)}>
                ▶ {t("news.hub.videoNews")}
              </button>
            </div>
          </Group>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-glass-border px-5 py-4">
          <button type="button" onClick={onReset} className="text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {tr("Reset filters")}
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-gradient-to-r from-azure to-neon-purple px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {tr("Show stories")}
          </button>
        </div>
      </div>
    </div>
  );
}
