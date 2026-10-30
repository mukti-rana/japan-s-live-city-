"use client";

import { pickJaEn } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// A quiet heading that groups the Emergency Center's cards.
export default function SectionHeading({
  id,
  title,
  note,
}: {
  id: string;
  title: { en: string; ja: string };
  note?: { en: string; ja: string };
}) {
  const { language } = useLanguage();
  return (
    <div id={id} className="scroll-mt-24 border-b border-glass-border pb-2 pt-2">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{pickJaEn(title, language)}</h2>
      {note && <p className="mt-0.5 text-sm text-muted">{pickJaEn(note, language)}</p>}
    </div>
  );
}
