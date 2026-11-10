"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { useTranslate } from "@/lib/i18n/inline";
import { DISCUSSION_LIMITS, validateAnswerInput } from "@/lib/community/validation";

// Write an answer. A guest who tries gets the friendly sign-up card. One answer
// per person: if you already answered, the page says so instead of showing this.
export default function AnswerForm({ questionId }: { questionId: string }) {
  const tr = useTranslate();
  const router = useRouter();
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!user) return requestAccount();
    const checked = validateAnswerInput({ questionId, body: text });
    if (!checked.ok) return setError(checked.errors.body ?? "Something went wrong. Please try again.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/community/answers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checked.value) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok || res.status === 409) {
        // On a 409 the person already has an answer: refresh so it shows (with Edit).
        if (res.ok) setText("");
        router.refresh();
        if (res.ok) {
          setBusy(false);
          return;
        }
      }
      setError(data.error ?? "We couldn't post your answer. Please try again.");
    } catch {
      setError("We couldn't post your answer. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
      <label htmlFor="answer-body" className="text-base font-semibold text-foreground">
        {tr("Your answer")}
      </label>
      <textarea
        id="answer-body"
        value={text}
        onChange={(e) => { setText(e.target.value); if (error) setError(""); }}
        onFocus={() => { if (!user) requestAccount(); }}
        rows={5}
        maxLength={DISCUSSION_LIMITS.answerMax}
        placeholder={tr("Share what you know. Specific tips are the most helpful.")}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-xl border border-glass-border bg-black/30 px-3.5 py-2.5 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {tr("Post answer")}
        </button>
        <span className="ml-auto text-[11px] tabular-nums text-foreground/70">
          {text.length} / {DISCUSSION_LIMITS.answerMax}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-sakura">
          {tr(error)}
        </p>
      )}
    </form>
  );
}
