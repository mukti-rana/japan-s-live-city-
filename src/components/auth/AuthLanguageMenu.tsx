"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGES } from "@/lib/i18n/languages";

// The language choice for the sign-in page, top right. It sits inside the
// page itself (the app's own switcher is covered by this full-screen page and
// its mobile sheet would open underneath it). Picking a language translates
// the whole page at once and is remembered like everywhere else in the app.
export default function AuthLanguageMenu() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
    // Start on the language in use, so the arrow keys begin from where you are.
    (items().find((el) => el.getAttribute("aria-checked") === "true") ?? items()[0])?.focus();

    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
      const list = items();
      if (!list.length) return;
      e.preventDefault();
      const at = list.indexOf(document.activeElement as HTMLElement);
      const next = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : (at + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
      list[next]?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("languageSwitcher.label")}: ${current.label}`}
        className="flex h-10 items-center gap-2 rounded-full border border-white/20 bg-panel/70 px-3.5 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:border-white/40 hover:bg-panel/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac"
      >
        <Globe size={16} aria-hidden="true" />
        <span className="max-w-[7rem] truncate">{current.label}</span>
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" aria-label={t("languageSwitcher.label")} className="absolute right-0 top-full z-10 mt-2 w-56 rounded-2xl border border-white/15 bg-panel p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]">
          {LANGUAGES.map((lang) => {
            const active = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac ${active ? "bg-lilac/15 text-foreground" : "text-foreground/80 hover:bg-white/10 hover:text-foreground"}`}
              >
                <span aria-hidden="true" className="text-base">{lang.flag}</span>
                <span className="min-w-0 flex-1 truncate text-left">{lang.label}</span>
                {active && <Check size={14} aria-hidden="true" className="shrink-0 text-lilac" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
