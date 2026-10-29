"use client";

import { useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { LanguageCode } from "@/lib/i18n/languages";

// A string with its translations beside it. English is required and is what a
// reader sees in any language that hasn't been translated yet.
export type Text = { en: string } & Partial<Record<LanguageCode, string>>;
export type Table = Record<string, Text>;

export function pick(text: Text, language: LanguageCode): string {
  return text[language] ?? text.en;
}

// For content that exists only in English and Japanese: anything other than
// Japanese reads the English.
export function pickJaEn<T>(value: { en: T; ja: T }, language: LanguageCode): T {
  return language === "ja" ? value.ja : value.en;
}

export function useInline<T extends Table>(table: T) {
  const { language } = useLanguage();
  return useCallback((key: keyof T & string): string => pick(table[key], language), [table, language]);
}
