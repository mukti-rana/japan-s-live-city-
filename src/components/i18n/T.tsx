"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

// Drop-in translated text for use inside Server Components — avoids
// converting a whole data-fetching widget to a client component just to
// translate one caption.
export default function T({ k }: { k: TranslationKey }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
