export type LanguageCode = "en" | "ja" | "ne" | "hi" | "zh" | "ko";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ne", label: "नेपाली", flag: "🇳🇵" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? "English";
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && LANGUAGES.some((l) => l.code === value);
}
