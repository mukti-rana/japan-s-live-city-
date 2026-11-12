"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import AIOrbFace from "@/components/smoothui/ai-orb-face";
import type { AIState } from "@/components/smoothui/ai-core";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Compact AI teaser that lives in the hero's right column (swapped in for
// the weather stats that used to sit there — the full weather panel lives
// in LiveWeatherCard below, so it isn't duplicated here). Submitting
// routes to /ai-assistant?q=... and auto-sends, same as AIAssistantCard.
export default function HeroAIBox() {
  const { t } = useLanguage();
  const router = useRouter();
  const [value, setValue] = useState("");
  // The orb reacts to what you do here: it "listens" while you type and
  // "thinks" for a moment as you send the question to the assistant page.
  const [sending, setSending] = useState(false);
  const orbState: AIState = sending ? "thinking" : value.trim() ? "listening" : "idle";

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    router.push(`/ai-assistant?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-glass-border p-4">
      <motion.div
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-azure/40 via-neon-purple/40 to-sakura/40 blur-3xl"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.08, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="shrink-0">
            <AIOrbFace aria-label={`Assistant is ${orbState}`} size={120} state={orbState} />
          </div>
          <div className="min-w-[8rem]">
            <p className="text-sm font-semibold text-foreground">
              <T k="ai.homeGreetingTitle" />
            </p>
            <p className="text-[10px] text-neon-cyan">
              <T k="ai.poweredByClaude" />
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(value);
        }}
        className="relative mt-3 flex items-center gap-2 rounded-full border border-glass-border bg-glass-bg px-2 py-1.5"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("ai.askPlaceholder")}
          className="min-w-0 flex-1 bg-transparent px-2 text-xs text-foreground placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          aria-label={t("ai.askButton")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-azure to-neon-purple text-white transition-opacity hover:opacity-90"
        >
          <ArrowRight size={13} />
        </button>
      </form>
    </div>
  );
}
