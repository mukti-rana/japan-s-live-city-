"use client";

import { Anchor, Ambulance, PhoneCall, ShieldAlert } from "lucide-react";
import { CALL_NOTES, DESKTOP_CALL_NOTE, EMERGENCY_NUMBERS, QUICK_NUMBERS, VERIFIED_ON } from "@/lib/emergency/content";
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
