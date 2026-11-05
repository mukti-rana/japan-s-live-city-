"use client";

import { Anchor, Ambulance, Headset, PhoneCall, ShieldAlert } from "lucide-react";
import { CALL_NOTES, DESKTOP_CALL_NOTE, EMERGENCY_NUMBERS, QUICK_NUMBERS, VERIFIED_ON, VISITOR_HOTLINE } from "@/lib/emergency/content";
import { E } from "@/lib/emergency/strings";
import { pickJaEn, useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ICONS = { police: ShieldAlert, fire: Ambulance, coastguard: Anchor };

// The three numbers that matter most. Plain, bundled content: it renders with
// the page, needs no login, no location and no network call, and the buttons
// are ordinary tel: links — they only open the phone app, and the page never
// claims a call was placed. Red is kept for the Call button and the icon.
export default function EmergencyNumbers({ id = "numbers" }: { id?: string }) {
  const { language } = useLanguage();
  const t = useInline(E);
  const notes = pickJaEn(CALL_NOTES, language);

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground sm:text-xl">
          {t("homeTitle")}
        </h2>
        <p className="text-xs text-muted">{t("free24")}</p>
      </div>

      <ul className="mt-3 grid gap-3 md:grid-cols-3">
        {QUICK_NUMBERS.map((q) => {
          const Icon = ICONS[q.id];
          const label = pickJaEn(q.label, language);
          const details = EMERGENCY_NUMBERS.filter((n) => q.ids.includes(n.id));
          return (
            <li key={q.id} className="flex flex-col gap-4 rounded-2xl border border-glass-border bg-glass-bg p-4 backdrop-blur-xl sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300 ring-1 ring-red-400/25">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted">{pickJaEn(q.short, language)}</p>
                </div>
              </div>

              <p className="text-5xl font-bold tabular-nums leading-none tracking-wide text-foreground">{q.number}</p>

              <a
                href={`tel:${q.number}`}
                aria-label={`${t("call")} ${q.number} — ${label}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-base font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-red-700"
              >
                <PhoneCall size={18} aria-hidden="true" />
                {t("call")} {q.number}
              </a>

              <ul className="flex flex-col gap-2">
                {details.map((n) => (
                  <li key={n.id} className="rounded-xl border border-glass-border bg-background/30 px-3 py-2.5 text-sm">
                    <p className="leading-snug text-foreground/85">{pickJaEn(n.use, language)}</p>
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{t("say")}</p>
                    <p className="text-base font-semibold text-foreground">{n.say.ja}</p>
                    <p className="text-xs text-muted">
                      {n.say.romaji} — {n.say.en}
                    </p>
                  </li>
                ))}
              </ul>

              <p className="mt-auto text-[11px] text-muted">
                {t("source")}:{" "}
                {details
                  .filter((n, i, all) => all.findIndex((m) => m.source.url === n.source.url) === i)
                  .map((n) => (
                    <a key={n.source.url} href={n.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                      {n.source.name}
                    </a>
                  ))}
              </p>
            </li>
          );
        })}
      </ul>

      {/* Visitor support: not an emergency number, so it sits apart from the three above. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-glass-border bg-glass-bg p-4 backdrop-blur-xl">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-azure/15 text-azure">
          <Headset size={21} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-sm font-semibold text-foreground">
            Japan Visitor Hotline <span className="ml-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">{language === "ja" ? "緊急通報ではありません" : "Not an emergency number"}</span>
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {language === "ja"
              ? "訪日外国人向けの多言語サポート（英語・中国語・韓国語、24時間）。命に関わるときは110・119へ。"
              : "Multilingual help for visitors (English, Chinese, Korean; 24 hours). If life is at risk, call 110 or 119 first."}
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums tracking-wide text-foreground">{VISITOR_HOTLINE.number}</p>
        <a
          href={`tel:${VISITOR_HOTLINE.tel}`}
          aria-label={`${t("call")} ${VISITOR_HOTLINE.number}`}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-azure/40 bg-azure/15 px-4 text-sm font-semibold text-azure transition-colors hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          <PhoneCall size={16} aria-hidden="true" />
          {t("call")}
        </a>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-glass-border bg-glass-bg p-4 backdrop-blur-xl">
          <h3 className="text-sm font-semibold text-foreground">{t("languagesTitle")}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground/80">
            {notes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <p className="rounded-2xl border border-glass-border bg-glass-bg p-4 text-sm leading-relaxed text-foreground/80 backdrop-blur-xl">
          {pickJaEn(DESKTOP_CALL_NOTE, language)}
        </p>
      </div>

      <p className="mt-3 text-[11px] text-muted">
        {t("verified")} {VERIFIED_ON}. {t("disclaimer")}
      </p>
    </section>
  );
}
