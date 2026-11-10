"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { known } from "@/lib/i18n/translate";

// A place or topic name that has both an English and a Japanese form, shown in
// the visitor's language (Japanese from the data; other languages from the
// translation memory when it knows the name, otherwise English).
export default function Bi({ en, ja }: { en: string; ja: string }) {
  const { language } = useLanguage();
  return <>{language === "ja" ? ja : known(en, language)}</>;
}
