"use client";

import { Anchor, Ambulance, Flame, PhoneCall, ShieldAlert } from "lucide-react";
import { CALL_NOTES, DESKTOP_CALL_NOTE, EMERGENCY_NUMBERS, VERIFIED_ON, type EmergencyNumber } from "@/lib/emergency/content";
import { E } from "@/lib/emergency/strings";
import { pick, pickJaEn, useInline, type Text } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const NAMES: Record<EmergencyNumber["id"], Text> = {
  police: { en: "Police", ja: "警察", ne: "प्रहरी", hi: "पुलिस", zh: "警察", ko: "경찰" },
  fire: { en: "Fire", ja: "消防（火事・救助）", ne: "दमकल", hi: "दमकल", zh: "消防", ko: "소방" },
  ambulance: { en: "Ambulance", ja: "救急", ne: "एम्बुलेन्स", hi: "एम्बुलेंस", zh: "救护车", ko: "구급차" },
  coastguard: { en: "Coast Guard", ja: "海上保安庁", ne: "तटरक्षक", hi: "तटरक्षक", zh: "海上保安厅", ko: "해상보안청" },
};

const ICONS = { police: ShieldAlert, fire: Flame, ambulance: Ambulance, coastguard: Anchor };

// The four numbers that matter most. This block is plain, bundled content: it
// renders with the page, needs no login, no location and no network call, and
// the buttons are ordinary tel: links — they only open the phone app, and the
// page never claims a call was placed.
export default function EmergencyNumbers({ id = "numbers" }: { id?: string }) {
  const { language } = useLanguage();
  const t = useInline(E);
  const notes = pickJaEn(CALL_NOTES, language);

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-3xl border-2 border-red-500/60 bg-[#2b0b12] p-4 sm:p-6">
      <h2 id={`${id}-title`} className="text-lg font-bold uppercase tracking-wide text-red-100 sm:text-xl">
        {t("homeTitle")}
      </h2>
      <p className="mt-1 text-sm text-red-100/80">{t("free24")}</p>

      {/* Small screens: all three numbers in one row, above everything else. */}
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
        {[
          { n: "110", label: pick(NAMES.police, language) },
          { n: "119", label: `${pick(NAMES.fire, language).split("（")[0]} / ${pick(NAMES.ambulance, language)}` },
          { n: "118", label: pick(NAMES.coastguard, language) },
        ].map((q) => (
          <li key={q.n}>
            <a
              href={`tel:${q.n}`}
              aria-label={`${t("call")} ${q.n} — ${q.label}`}
              className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl bg-red-600 px-1 text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              <span className="text-3xl font-extrabold tabular-nums leading-none">{q.n}</span>
              <span className="mt-1 text-center text-[10px] font-medium leading-tight text-red-50">{q.label}</span>
            </a>
          </li>
        ))}
      </ul>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {EMERGENCY_NUMBERS.map((n) => {
          const Icon = ICONS[n.id];
          return (
            <li key={n.id} className="flex flex-col gap-3 rounded-2xl bg-black/35 p-4 ring-1 ring-red-400/30">
              <div className="flex items-center gap-2 text-red-100">
                <Icon size={20} aria-hidden="true" />
                <span className="text-base font-semibold">{pick(NAMES[n.id], language)}</span>
              </div>
              <a
                href={`tel:${n.number}`}
                aria-label={`${t("call")} ${n.number} — ${pick(NAMES[n.id], language)}`}
                className="flex min-h-[4.5rem] items-center justify-center gap-3 rounded-xl bg-red-600 px-4 text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white active:bg-red-700"
              >
                <PhoneCall size={26} aria-hidden="true" />
                <span className="text-4xl font-extrabold tabular-nums tracking-wide">{n.number}</span>
              </a>
              <p className="text-sm leading-snug text-red-50">{pickJaEn(n.use, language)}</p>
              <p className="rounded-lg bg-black/40 px-3 py-2 text-sm text-red-50">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-red-200/80">{t("say")}</span>
                <span className="mt-0.5 block text-lg font-semibold">{n.say.ja}</span>
                <span className="block text-xs text-red-100/80">
                  {n.say.romaji} — {n.say.en}
                </span>
              </p>
              <p className="mt-auto text-[11px] text-red-100/60">
                {t("source")}:{" "}
                <a href={n.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-red-50">
                  {n.source.name}
                </a>
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-red-100">{t("languagesTitle")}</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-red-50/90">
            {notes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <p className="rounded-xl bg-black/30 p-3 text-sm leading-relaxed text-red-50/90">{pickJaEn(DESKTOP_CALL_NOTE, language)}</p>
      </div>

      <p className="mt-3 text-[11px] text-red-100/60">
        {t("verified")} {VERIFIED_ON}. {t("disclaimer")}
      </p>
    </section>
  );
}
