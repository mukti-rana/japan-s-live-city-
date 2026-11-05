"use client";

import { useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { pick, translate } from "@/lib/i18n/translate";
import type { Table } from "@/lib/i18n/translate";

// Everything that doesn't need React lives in translate.ts, so server code
// (API routes, the catalogue) can use it too. It is re-exported here so
// components keep importing from one place.
export { known, localize, localizeAlert, pick, pickJaEn, translate, translateWithNumber } from "@/lib/i18n/translate";
export type { Table, Text } from "@/lib/i18n/translate";

export function useInline<T extends Table>(table: T) {
  const { language } = useLanguage();
  return useCallback((key: keyof T & string): string => pick(table[key], language), [table, language]);
}

// For text that arrives from a service already in English (a weather
// condition, a warning title): translated when the shared memory knows it,
// otherwise shown as received.
export function useTranslate() {
  const { language } = useLanguage();
  return useCallback((english: string): string => translate(english, language), [language]);
}
