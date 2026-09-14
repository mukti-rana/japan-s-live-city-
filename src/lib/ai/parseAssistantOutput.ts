const MARKERS = {
  error: "###ERROR###",
  polite: "###POLITE_JAPANESE###",
  hiragana: "###HIRAGANA###",
  english: "###ENGLISH###",
} as const;

export interface ParsedAssistantOutput {
  polite: string;
  hiragana: string;
  english: string;
  error: string | null;
  raw: string | null;
}

export function parseAssistantOutput(text: string): ParsedAssistantOutput {
  const errorIndex = text.indexOf(MARKERS.error);
  if (errorIndex !== -1) {
    return {
      polite: "",
      hiragana: "",
      english: "",
      error: text.slice(errorIndex + MARKERS.error.length).trim(),
      raw: null,
    };
  }

  const politeIndex = text.indexOf(MARKERS.polite);
  const hiraganaIndex = text.indexOf(MARKERS.hiragana);
  const englishIndex = text.indexOf(MARKERS.english);

  if (politeIndex === -1) {
    return {
      polite: "",
      hiragana: "",
      english: "",
      error: null,
      raw: text.trim() || null,
    };
  }

  const politeEnd = hiraganaIndex !== -1 ? hiraganaIndex : englishIndex !== -1 ? englishIndex : undefined;
  const hiraganaEnd = englishIndex !== -1 ? englishIndex : undefined;

  return {
    polite: text.slice(politeIndex + MARKERS.polite.length, politeEnd).trim(),
    hiragana:
      hiraganaIndex !== -1
        ? text.slice(hiraganaIndex + MARKERS.hiragana.length, hiraganaEnd).trim()
        : "",
    english:
      englishIndex !== -1
        ? text.slice(englishIndex + MARKERS.english.length).trim()
        : "",
    error: null,
    raw: null,
  };
}
