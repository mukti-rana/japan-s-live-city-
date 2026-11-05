"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { lookup } from "@/lib/i18n/translate";

const SUFFIX = " — Live City Japan";

// Kept outside the component so a language change still knows the English title.
let original: string | null = null;
let applied = "";

// Page titles are set on the server in English ("Weather — Live City Japan").
// This re-writes the browser-tab title into the chosen language whenever the
// page or the language changes. A title with no entry in the translation
// memory (one built from live data) is left exactly as the page set it.
export default function LocalizedTitle() {
  const { language } = useLanguage();

  useEffect(() => {
    const el = document.querySelector("title");
    if (!el) return;
    // `original` is the English title the page set; `applied` is what we wrote.
    const apply = () => {
      if (original === null || document.title !== applied) original = document.title; // the page set a new title
      const hasSuffix = original.endsWith(SUFFIX);
      const head = hasSuffix ? original.slice(0, -SUFFIX.length) : original;
      const local = lookup(head, language);
      applied = local ? (hasSuffix ? `${local}${SUFFIX}` : local) : original;
      if (document.title !== applied) document.title = applied;
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
