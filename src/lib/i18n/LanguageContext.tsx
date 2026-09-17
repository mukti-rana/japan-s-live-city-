"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from "@/lib/i18n/languages";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

const STORAGE_KEY = "livecity:language";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  ready: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  // Reads localStorage (unavailable during SSR) to correct the language
  // after hydration — the SSR-safe default render must match the client's
  // first render exactly, so this can't be done during render itself.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLanguageCode(stored)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguageState(stored);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — keep default.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Ignore write failures — the in-memory state still updates.
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return dictionaries[language]?.[key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
