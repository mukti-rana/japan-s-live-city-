"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";
import { useDismiss, useHoverMenu } from "@/components/layout/usePopover";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-black";

// The hero's AI spark. Alone it is just a softly shining icon. Pointing at it with a mouse (or tapping it, or tabbing to it)
// opens a question bar beside it: the bar blooms out of the icon (a circle of light widening to the right, sharpening out of
// a blur, with a small overshoot), which is deliberately unlike the header search, which slides open in width. Enter or the
// arrow opens the assistant with the question; an empty bar just opens the assistant. It closes when the mouse leaves (unless
// it was clicked open, or holds text, or has the keyboard in it), on Escape, and on a press outside.
export default function HeroAskAI() {
  const { t } = useLanguage();
  const tr = useTranslate();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [inside, setInside] = useState(false);
  const [question, setQuestion] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const shown = open || inside || question !== "";
  const close = useCallback(() => {
    setOpen(false);
    setInside(false);
  }, []);
  useDismiss(shown, close, box);
  const { hover, toggle } = useHoverMenu(open, setOpen);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    router.push(q ? `/ai-assistant?q=${encodeURIComponent(q)}` : "/ai-assistant");
  }

  return (
    <div
      ref={box}
      {...hover}
      onFocusCapture={() => setInside(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setInside(false);
      }}
      className="relative flex items-center"
    >
      <button
        type="button"
        aria-label={tr("Ask LIVE CITY AI")}
        aria-expanded={shown}
        aria-controls="hero-ask-bar"
        onClick={() => {
          toggle();
          window.setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
        }}
        className={`hero-ai ${ring}`}
      >
        <Sparkles size={36} strokeWidth={1.9} aria-hidden="true" className="hero-ai__icon" />
      </button>

      <form id="hero-ask-bar" role="search" aria-label={tr("Ask LIVE CITY AI")} inert={!shown} data-open={shown ? "true" : "false"} onSubmit={ask} className="hero-ask">
        <input ref={input} value={question} onChange={(e) => setQuestion(e.target.value)} aria-label={tr("Ask LIVE CITY AI")} placeholder={t("ai.askPlaceholder")} className="hero-ask__field" />
        <button type="submit" aria-label={t("ai.askButton")} className={`hero-ask__go ${ring}`}>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
