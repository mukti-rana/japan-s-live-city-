"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

const SUGGESTED_KEYS: TranslationKey[] = [
  "ai.suggestedBestPlaces",
  "ai.suggestedTrainDelays",
  "ai.suggestedHappening",
  "ai.suggestedRestaurants",
];

export default function AIAssistantCard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [value, setValue] = useState("");

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    router.push(`/ai-assistant?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <GlassCard className="relative overflow-hidden p-5">
      <motion.div
        className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-azure/40 via-neon-purple/40 to-sakura/40 blur-3xl"
        animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-azure via-neon-purple to-sakura text-foreground shadow-[0_0_22px_4px_rgba(168,85,247,0.45)]"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={20} />
          </motion.div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              <T k="ai.homeGreetingTitle" />
            </p>
            <p className="text-[11px] text-neon-cyan">
              <T k="ai.poweredByClaude" />
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-foreground/80">
          <T k="ai.homeGreeting" />
        </p>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => ask(t(key))}
              className="rounded-full border border-glass-border bg-glass-bg px-3 py-1.5 text-xs text-muted transition-colors hover:border-neon-purple/40 hover:text-foreground"
            >
              {t(key)}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(value);
          }}
          className="flex items-center gap-2 rounded-full border border-glass-border bg-glass-bg px-2 py-1.5"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("ai.askPlaceholder")}
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t("ai.askButton")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-azure to-neon-purple text-foreground transition-opacity hover:opacity-90"
          >
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </GlassCard>
  );
}
