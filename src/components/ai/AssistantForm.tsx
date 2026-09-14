"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, TriangleAlert, Loader2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import {
  parseAssistantOutput,
  type ParsedAssistantOutput,
} from "@/lib/ai/parseAssistantOutput";

const EXAMPLES = [
  "Tell my boss I'll be late because the train stopped",
  "Ask my teacher for an extension on an assignment",
  "Explain I have a doctor's appointment and need to leave early",
];

type Status = "idle" | "loading" | "error";

export default function AssistantForm({ configured }: { configured: boolean }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [output, setOutput] = useState<ParsedAssistantOutput | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || status === "loading") return;

    setStatus("loading");
    setFetchError(null);
    setOutput(null);
    setCopied(false);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setFetchError(data?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setStatus("idle");

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setOutput(parseAssistantOutput(buffer));
      }
    } catch {
      setFetchError("Couldn't reach the AI Assistant. Check your connection and try again.");
      setStatus("error");
    }
  }

  function copyPolite() {
    if (!output?.polite) return;
    navigator.clipboard.writeText(output.polite);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-4">
      {!configured && (
        <GlassCard className="flex items-start gap-2.5 border-gold/25 bg-gold/5 p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold" />
          <p className="text-xs leading-relaxed text-muted">
            The AI Assistant isn&apos;t configured yet. Add{" "}
            <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">
              ANTHROPIC_API_KEY
            </code>{" "}
            to <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">.env.local</code>{" "}
            and restart the dev server to enable it.
          </p>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block">
            <span className="text-xs font-medium text-muted">
              What do you need to say or understand?
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. I need to tell my boss I'm late because the train stopped."
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl border border-glass-border bg-glass-bg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-sakura/40"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setMessage(example)}
                className="rounded-lg border border-glass-border bg-glass-bg px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-azure/30 hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!configured || !message.trim() || status === "loading"}
            className="flex items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "loading" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {status === "loading" ? "Thinking..." : "Ask"}
          </button>
        </form>
      </GlassCard>

      {fetchError && (
        <GlassCard className="flex items-start gap-2.5 border-sakura/25 bg-sakura/5 p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-sakura" />
          <p className="text-xs leading-relaxed text-muted">{fetchError}</p>
        </GlassCard>
      )}

      {output?.error && (
        <GlassCard className="flex items-start gap-2.5 border-sakura/25 bg-sakura/5 p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-sakura" />
          <p className="text-xs leading-relaxed text-muted">{output.error}</p>
        </GlassCard>
      )}

      {output?.raw && (
        <GlassCard className="p-5">
          <p className="whitespace-pre-wrap text-sm text-foreground">{output.raw}</p>
        </GlassCard>
      )}

      {output && !output.error && !output.raw && (output.polite || output.hiragana || output.english) && (
        <GlassCard className="flex flex-col gap-4 p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-sakura">
                Polite Japanese
              </span>
              {output.polite && (
                <button
                  type="button"
                  onClick={copyPolite}
                  className="flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-foreground"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            <p className="mt-1.5 font-jp text-lg text-foreground">
              {output.polite || <span className="text-muted">…</span>}
            </p>
          </div>

          <div className="border-t border-glass-border pt-3.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gold">
              Hiragana
            </span>
            <p className="mt-1.5 font-jp text-sm text-foreground/85">
              {output.hiragana || <span className="text-muted">…</span>}
            </p>
          </div>

          <div className="border-t border-glass-border pt-3.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-azure">
              English
            </span>
            <p className="mt-1.5 text-sm text-foreground/85">
              {output.english || <span className="text-muted">…</span>}
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
