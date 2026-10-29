"use client";

import { ChevronDown, ExternalLink, PhoneCall } from "lucide-react";
import { OTHER_NUMBERS, SCENARIOS, type Urgency } from "@/lib/emergency/content";
import { E } from "@/lib/emergency/strings";
import { pickJaEn, useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const URGENCY_STYLE: Record<Urgency, string> = {
  emergency: "bg-red-600 text-white",
  "non-emergency": "bg-amber-400 text-black",
  information: "bg-sky-300 text-black",
};

// Quick guidance for the situations people most often face. Each item says
// plainly whether it is an emergency call or something that is not.
export default function EmergencyGuidance() {
  const { language } = useLanguage();
  const t = useInline(E);
  const label = (u: Urgency) => (u === "emergency" ? t("urgencyEmergency") : u === "non-emergency" ? t("urgencyNon") : t("urgencyInfo"));

  return (
    <div className="flex flex-col gap-6">
      <section id="guidance" aria-labelledby="guidance-title" className="scroll-mt-24">
        <h2 id="guidance-title" className="text-lg font-bold text-foreground">
          {t("guidance")}
        </h2>
        <p className="mt-1 text-xs text-muted">{t("generalNote")}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <details className="group rounded-2xl border border-white/15 bg-panel open:border-white/30">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure [&::-webkit-details-marker]:hidden">
                  <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${URGENCY_STYLE[s.urgency]}`}>{label(s.urgency)}</span>
                  <span className="flex-1 text-base font-semibold text-foreground">{pickJaEn(s.title, language)}</span>
                  {s.call && (
                    <span className="hidden shrink-0 items-center gap-1 rounded-md bg-red-600/20 px-2 py-1 text-sm font-bold text-red-200 sm:flex">
                      <PhoneCall size={13} aria-hidden="true" />
                      {s.call}
                    </span>
                  )}
                  <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="px-4 pb-4">
                  {s.call && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {s.call.split(" / ").map((n) => (
                        <a
                          key={n}
                          href={`tel:${n}`}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-base font-bold text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
                        >
                          <PhoneCall size={16} aria-hidden="true" />
                          {t("call")} {n}
                        </a>
                      ))}
                    </div>
                  )}
                  <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
                    {pickJaEn(s.steps, language).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {s.links && (
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {s.links.map((l) => (
                        <li key={l.url}>
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-azure hover:underline">
                            {pickJaEn(l.label, language)}
                            <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="other-title" className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4">
        <h2 id="other-title" className="text-base font-bold text-amber-100">
          {t("nonEmergency")}
        </h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {OTHER_NUMBERS.map((n) => (
            <li key={n.id} className="flex flex-col gap-2 rounded-xl bg-black/25 p-3">
              <p className="text-2xl font-extrabold tabular-nums text-amber-200">{n.number}</p>
              <p className="text-sm font-semibold text-foreground">{pickJaEn(n.label, language)}</p>
              <p className="text-[13px] leading-relaxed text-foreground/80">{pickJaEn(n.note, language)}</p>
              <p className="mt-auto text-[11px] text-muted">
                {t("source")}:{" "}
                <a href={n.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  {n.source.name}
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
