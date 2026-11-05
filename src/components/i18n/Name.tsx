"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { known } from "@/lib/i18n/translate";

// A place or publisher name in a Server Component: shown in the visitor's
// language when the translation memory knows it, otherwise exactly as given.
export default function Name({ en }: { en: string }) {
  const { language } = useLanguage();
  return <>{known(en, language)}</>;
}
