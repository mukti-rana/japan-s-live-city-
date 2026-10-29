"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { PHRASES, type LangCode, type Phrase } from "@/lib/emergency/content";
import { E } from "@/lib/emergency/strings";
import { useInline } from "@/lib/i18n/inline";
import { LANGUAGES } from "@/lib/i18n/languages";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function translation(p: Phrase, lang: LangCode): string {
  return lang === "ja" ? p.tr.en : p.tr[lang];
}

// Japanese phrases for an emergency, with a pronunciation guide and a
// translation. "Show large" fills the screen with the Japanese so it can be
// shown to someone nearby.
export default function PhrasesCard() {
  const { language } = useLanguage();
  const t = useInline(E);
  // The translation language follows the site's language selector until the
  // visitor picks a different one here.
  const [chosen, setChosen] = useState<LangCode | null>(null);
  const lang: LangCode = chosen ?? (language === "ja" ? "en" : (language as LangCode));
  const [place, setPlace] = useState("");
  const [large, setLarge] = useState<Phrase | null>(null);

  const jaText = (p: Phrase) => (p.fillIn && place.trim() ? p.ja.replace("＿＿＿", place.trim()) : p.ja);
  const trText = (p: Phrase) => (p.fillIn && place.trim() ? translation(p, lang).replace("___", place.trim()) : translation(p, lang));

  useEffect(() => {
    if (!large) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLarge(null);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [large]);

  return (
    <section id="phrases" aria-labelledby="phrases-title" className="scroll-mt-24 rounded-2xl border border-white/15 bg-panel p-4 sm:p-5">
      <h2 id="phrases-title" className="text-lg font-bold text-foreground">
        {t("phrasesTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("phrasesIntro")}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          {t("yourLanguage")}
          <select value={lang} onChange={(e) => setChosen(e.target.value as LangCode)} className="h-11 rounded-xl border border-white/20 bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {LANGUAGES.filter((l) => l.code !== "ja").map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          {t("fillLocation")}
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("fillLocationPlaceholder")} maxLength={60} className="h-11 rounded-xl border border-white/20 bg-background px-3 text-base text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure" />
        </label>
      </div>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {PHRASES.map((p) => (
          <li key={p.id} className="flex flex-col gap-1.5 rounded-xl border border-white/15 bg-black/20 p-3.5">
            <p className="font-jp text-2xl font-bold leading-snug text-foreground">{jaText(p)}</p>
            <p className="text-sm text-foreground/85">{p.romaji}</p>
            <p className="text-xs text-muted">
              {t("sayItLike")}: <span className="font-medium text-foreground/80">{p.say}</span>
            </p>
            <p className="text-base font-medium text-azure">{trText(p)}</p>
            <button
              type="button"
              onClick={() => setLarge(p)}
              className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/25 px-4 text-sm font-semibold text-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              <Maximize2 size={15} aria-hidden="true" />
              {t("showLarge")}
            </button>
          </li>
        ))}
      </ul>

      {large && (
        <div role="dialog" aria-modal="true" aria-label={t("showLarge")} className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-white p-6 text-center text-black">
          <button type="button" onClick={() => setLarge(null)} aria-label={t("close")} className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500">
            <X size={24} aria-hidden="true" />
          </button>
          <p className="font-jp text-5xl font-extrabold leading-tight sm:text-7xl">{jaText(large)}</p>
          <p className="text-2xl font-semibold text-neutral-700 sm:text-3xl">{trText(large)}</p>
        </div>
      )}
    </section>
  );
}
