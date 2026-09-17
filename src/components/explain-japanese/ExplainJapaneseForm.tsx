"use client";

import { useState } from "react";
import { Languages, TriangleAlert, Loader2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { useOneShotAssistant } from "@/lib/ai/useOneShotAssistant";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ExplainJapaneseForm({ configured }: { configured: boolean }) {
  const { language, t } = useLanguage();
  const [text, setText] = useState("");
  const { submit, content, error, loading } = useOneShotAssistant();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured || !text.trim() || loading) return;
    await submit({ text: text.trim(), language, mode: "explain-japanese" });
  }

  return (
    <div className="flex flex-col gap-4">
      {!configured && (
        <GlassCard className="flex items-start gap-2.5 border-gold/25 bg-gold/5 p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold" />
          <p className="text-xs leading-relaxed text-muted">
            LIVE CITY AI isn&apos;t configured yet. Add{" "}
            <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">ANTHROPIC_API_KEY</code>{" "}
            to <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">.env.local</code> and
            restart the dev server to enable it.
          </p>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!configured}
            placeholder={t("explainJapanese.placeholder")}
            rows={5}
            className="w-full resize-none rounded-xl border border-glass-border bg-glass-bg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-sakura/40 disabled:opacity-50 font-jp"
          />
          <button
            type="submit"
            disabled={!configured || !text.trim() || loading}
            className="flex items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Languages size={15} />}
            {t("explainJapanese.submit")}
          </button>
        </form>
      </GlassCard>

      {error && (
        <GlassCard className="flex items-start gap-2.5 border-sakura/25 bg-sakura/5 p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-sakura" />
          <p className="text-xs leading-relaxed text-muted">{error}</p>
        </GlassCard>
      )}

      {content && (
        <GlassCard className="p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{content}</p>
        </GlassCard>
      )}
    </div>
  );
}
