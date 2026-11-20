"use client";

import "@/components/home/cinematic/cinematic.css";
import type { ReactNode } from "react";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import SlideInHeading from "@/components/home/cinematic/SlideInHeading";
import { playfair } from "@/components/home/cinematic/fonts";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import { useTranslate } from "@/lib/i18n/inline";

// The opening of every inner page, in the same voice as the home page's chapters: a small label, a large serif heading whose letters
// slide in one after another, a hairline that draws itself, and a line of introduction. Give the title as English text (`title`,
// translated here) or as a translation key (`titleKey`); the same for the label and the intro. `size="compact"` is for tool pages (the
// map) that need their room. Reduced motion shows everything in place. Playfair is loaded for inner pages through this component only.
type Text = { text?: string; keyOf?: TranslationKey };

export default function PageHero({
  label,
  labelKey,
  title,
  titleKey,
  intro,
  introKey,
  size = "normal",
  children,
  className = "",
}: {
  label?: string;
  labelKey?: TranslationKey;
  title?: string;
  titleKey?: TranslationKey;
  intro?: string;
  introKey?: TranslationKey;
  size?: "normal" | "compact";
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useLanguage();
  const tr = useTranslate();
  const pick = ({ text, keyOf }: Text) => (keyOf ? t(keyOf) : text ? tr(text) : "");
  const eyebrow = pick({ text: label, keyOf: labelKey });
  const heading = pick({ text: title, keyOf: titleKey });
  const line = pick({ text: intro, keyOf: introKey });
  const big = size === "normal";
  return (
    <header className={`${playfair.variable} ${className}`}>
      <ScrollReveal from="line" className="h-px w-full bg-foreground/10" />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-4 sm:pt-5">
        <div className="min-w-0">
          {eyebrow && (
            <ScrollReveal delay={0.1}>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">{eyebrow}</p>
            </ScrollReveal>
          )}
          <h1 className={`mt-2 font-[family-name:var(--font-home-serif)] font-normal leading-[1] tracking-[-0.02em] text-foreground ${big ? "text-[clamp(38px,6vw,84px)]" : "text-[clamp(28px,3.4vw,44px)]"}`}>
            <SlideInHeading en={heading} />
          </h1>
          {line && (
            <ScrollReveal delay={0.3}>
              <p className={`mt-3 max-w-[60ch] leading-relaxed text-text-secondary ${big ? "text-[clamp(15px,1.3vw,18px)]" : "text-sm"}`}>{line}</p>
            </ScrollReveal>
          )}
        </div>
        {children && (
          <ScrollReveal from="right" delay={0.36}>
            {children}
          </ScrollReveal>
        )}
      </div>
    </header>
  );
}
