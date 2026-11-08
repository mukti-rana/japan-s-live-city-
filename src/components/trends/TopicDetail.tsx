"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE, TrendImage, useNow, useTrendText, viewsShort } from "@/components/trends/shared";
import type { RadarTopic, TrendRadarData } from "@/lib/services/trendRadar";
import { useTranslate } from "@/lib/i18n/inline";

function Sparkline({ points }: { points: { date: string; views: number }[] }) {
  const tr = useTranslate();
  const max = Math.max(...points.map((p) => p.views), 1);
  const w = 560;
  const h = 120;
  const bw = w / points.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="h-36 w-full" role="img" aria-label={tr("Daily page views over the last two weeks")}>
        {points.map((p, i) => {
          const bh = Math.max(2, (p.views / max) * h);
          return (
            <g key={p.date}>
              <rect x={i * bw + 3} y={h - bh} width={bw - 6} height={bh} rx="3" fill={i === points.length - 1 ? "url(#spark-hi)" : "#4da3ff"} opacity={i === points.length - 1 ? 1 : 0.45}>
                <title>{`${p.date}: ${p.views.toLocaleString()}`}</title>
              </rect>
            </g>
          );
        })}
        <text x="0" y={h + 14} fontSize="10" fill="#8b8fa3">{points[0].date.slice(5)}</text>
        <text x={w} y={h + 14} fontSize="10" fill="#8b8fa3" textAnchor="end">{points[points.length - 1].date.slice(5)}</text>
        <defs>
          <linearGradient id="spark-hi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a855f7" />
            <stop offset="1" stopColor="#4da3ff" />
          </linearGradient>
        </defs>
      </svg>
      <figcaption className="text-[11px] text-muted">{tr("Peak {n} page views in a day.").replace("{n}", viewsShort(max))}</figcaption>
    </figure>
  );
}

// One trending topic in full: the picture, what it is, why it is on the radar
// (with the real numbers), its last two weeks of page views, related topics
// and the original articles.
export default function TopicDetail({ topic, data, history, related, unavailable }: { topic: RadarTopic | null; data: TrendRadarData | null; history: { date: string; views: number }[]; related: RadarTopic[]; unavailable: boolean }) {
  const tr = useTranslate();
  const text = useTrendText();
  const now = useNow();

  const back = (
    <Link href="/trending" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-azure">
      <ArrowLeft size={15} aria-hidden="true" />
      {tr("Japan Trend Radar")}
    </Link>
  );

  if (!topic || !data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {back}
        <div role="status" className="rounded-3xl border border-dashed border-glass-border p-10 text-center">
          <p className="font-semibold text-foreground">{unavailable ? tr("Trending topics couldn't be loaded right now. Please try again shortly.") : tr("This topic is no longer in the latest ranking.")}</p>
          <p className="mt-1 text-sm text-muted">{unavailable ? "" : tr("The ranking changes every day. See today's topics instead.")}</p>
          <Link href="/trending" className="mt-4 inline-flex rounded-full bg-gradient-to-r from-azure to-neon-purple px-5 py-2 text-sm font-semibold text-white">{tr("See today's topics")}</Link>
        </div>
      </div>
    );
  }

  const names = text.title(topic);
  const ja = topic.summary.ja ?? topic.description;
  const en = topic.summary.en;
  const change = text.change(topic, data);
  const enUrl = topic.names.en ? `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.names.en.replace(/ /g, "_"))}` : null;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      {back}
      <article className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="relative">
          <TrendImage topic={topic} alt={names.title} priority className="aspect-video w-full rounded-3xl border border-glass-border" />
          <span className="absolute left-4 top-4 flex h-11 min-w-11 items-center justify-center rounded-2xl bg-background/80 px-3 text-lg font-bold tabular-nums text-foreground backdrop-blur-sm">#{topic.rank}</span>
          {topic.image && <a href={topic.image.page} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 left-4 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/80 hover:text-white">{tr("Image")}: Wikipedia</a>}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {topic.category && <span className="rounded-full bg-azure/15 px-3 py-1 font-medium text-azure">{tr(CATEGORY_LABEL.get(topic.category) ?? "")}</span>}
            {topic.status && <span className={`rounded-full px-3 py-1 font-semibold ${STATUS_TONE[topic.status]}`}>{tr(STATUS_LABEL[topic.status])}</span>}
          </div>
          <h1 className={`text-3xl font-semibold leading-tight tracking-tight text-foreground ${names.original ? "" : "font-jp"}`}>{names.title}</h1>
          {names.original && <p className="font-jp text-lg text-muted">{names.original}</p>}
          {topic.description && <p className="font-jp text-sm text-foreground/70">{topic.description}</p>}
          <div className="rounded-2xl border border-glass-border bg-glass-bg p-4 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{tr("Why it is on the radar")}</p>
            <p className="mt-1.5 text-foreground/85">{text.why(data)}</p>
            <ul className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <li><span className="block text-[11px] text-muted">{tr("Page views")}</span><span className="text-lg font-semibold tabular-nums text-foreground">{topic.views.toLocaleString()}</span></li>
              <li><span className="block text-[11px] text-muted">{tr("Rank")}</span><span className="text-lg font-semibold tabular-nums text-foreground">#{topic.rank}</span></li>
              {topic.previous && (
                <li className="col-span-2 text-foreground/80">
                  {tr("Previous day{date}: {views} page views").replace("{date}", data.previousDate ? ` (${data.previousDate})` : "").replace("{views}", topic.previous.views.toLocaleString())}
                </li>
              )}
              {change && <li className="col-span-2 font-medium text-foreground/90">{change}</li>}
            </ul>
          </div>
        </div>
      </article>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-glass-border bg-glass-bg p-5">
          <h2 className="text-base font-semibold text-foreground">{tr("About this topic")}</h2>
          {ja || en ? (
            <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-foreground/80">
              {en && <p>{en}<span className="mt-1 block text-[11px] text-muted">{tr("From English Wikipedia")}</span></p>}
              {ja && <p className="font-jp">{ja}<span className="mt-1 block font-sans text-[11px] text-muted">{tr("From Japanese Wikipedia")}</span></p>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{tr("No description is available for this topic yet.")}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={topic.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 text-sm font-semibold text-white hover:opacity-90">
              {tr("Read on Japanese Wikipedia")}
              <ExternalLink size={13} aria-hidden="true" />
            </a>
            {enUrl && (
              <a href={enUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-glass-border px-4 text-sm font-medium text-foreground/90 hover:border-azure/40">
                {tr("Read on English Wikipedia")}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-glass-border bg-glass-bg p-5">
          <h2 className="text-base font-semibold text-foreground">{tr("Page views, last two weeks")}</h2>
          {history.length >= 2 ? (
            <div className="mt-3">
              <Sparkline points={history} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{tr("Daily history isn't available for this article right now.")}</p>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">{tr("Related topics")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((t) => (
              <li key={t.id}>
                <Link href={`/trending/${encodeURIComponent(t.id)}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-glass-border bg-glass-bg transition duration-300 hover:-translate-y-0.5 hover:border-azure/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <TrendImage topic={t} alt={text.title(t).title} className="aspect-video w-full" />
                  <span className="flex flex-col gap-0.5 p-3">
                    <span className="text-[10px] text-muted">#{t.rank} · {text.views(t)}</span>
                    <span className={`line-clamp-2 text-sm font-medium text-foreground group-hover:text-azure ${text.title(t).original ? "" : "font-jp"}`}>{text.title(t).title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="border-t border-glass-border pt-4 text-[11px] leading-relaxed text-muted">
        {tr("Source")}: {tr("Japanese Wikipedia page views")} (Wikimedia, CC0) · {text.measured(data)} · {text.retrieved(data, now)} · {tr("Pictures and introductions")}: Wikipedia (CC BY-SA 4.0)
      </p>
    </div>
  );
}
