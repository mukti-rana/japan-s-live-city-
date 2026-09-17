export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ne", label: "नेपाली", flag: "🇳🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

export const DEFAULT_LANGUAGE = "en";

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? "English";
}
