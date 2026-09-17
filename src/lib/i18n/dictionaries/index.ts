import type { LanguageCode } from "@/lib/i18n/languages";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import en from "@/lib/i18n/dictionaries/en";
import ja from "@/lib/i18n/dictionaries/ja";
import ne from "@/lib/i18n/dictionaries/ne";
import hi from "@/lib/i18n/dictionaries/hi";
import zh from "@/lib/i18n/dictionaries/zh";
import ko from "@/lib/i18n/dictionaries/ko";

export const dictionaries: Record<LanguageCode, Record<TranslationKey, string>> = {
  en,
  ja,
  ne,
  hi,
  zh,
  ko,
};
