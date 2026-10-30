"use client";

import { ExternalLink, Headset, PhoneCall } from "lucide-react";
import { VISITOR_HOTLINE } from "@/lib/emergency/content";
import { E } from "@/lib/emergency/strings";
import { pickJaEn, useInline, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const TEXT = {
  title: { en: "Japan Visitor Hotline", ja: "Japan Visitor Hotline（訪日外国人向け）" },
  badge: { en: "Not an emergency service", ja: "緊急通報ではありません" },
  abroad: { en: "From outside Japan", ja: "海外から" },
  hours: { en: "English · Chinese · Korean · 24 hours · every day", ja: "英語・中国語・韓国語・24時間・年中無休" },
} satisfies Table;

export default function VisitorSupport() {
  const { language } = useLanguage();
  const t = useInline(E);
  const text = useInline(TEXT);

  return (
    <section id="hotline" aria-labelledby="visitors-title" className="scroll-mt-24 rounded-2xl border border-glass-border bg-glass-bg p-4 backdrop-blur-xl sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="flex gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-azure/15 text-azure">
            <Headset size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="visitors-title" className="text-base font-semibold text-foreground">
                {text("title")}
              </h3>
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">{text("badge")}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">{pickJaEn(VISITOR_HOTLINE.note, language)}</p>
            <p className="mt-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-100">
              {pickJaEn(VISITOR_HOTLINE.warning, language)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-glass-border bg-background/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{text("hours")}</p>
          <p className="text-3xl font-bold tabular-nums tracking-wide text-foreground">{VISITOR_HOTLINE.number}</p>
          <p className="text-xs text-muted">
            {text("abroad")}: <span className="font-medium text-foreground/85">{VISITOR_HOTLINE.international}</span>
          </p>
          <a
            href={`tel:${VISITOR_HOTLINE.tel}`}
            aria-label={`${t("call")} ${VISITOR_HOTLINE.number}`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-azure/40 bg-azure/15 text-sm font-semibold text-azure transition-colors hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
          >
            <PhoneCall size={16} aria-hidden="true" />
            {t("call")}
          </a>
          <p className="text-[11px] text-muted">
            {t("source")}:{" "}
            <a
              href={VISITOR_HOTLINE.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
            >
              {VISITOR_HOTLINE.source.name}
              <ExternalLink size={10} aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
