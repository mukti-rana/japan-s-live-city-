"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";
import { DISCUSSION_LIMITS, validateAnswerBody } from "@/lib/community/validation";

const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-glass-border bg-glass-bg px-3 text-xs font-medium text-foreground transition-colors hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60";

// Edit or delete your own answer.
export default function AnswerOwnerTools({ id, body }: { id: string; body: string }) {
  const tr = useTranslate();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState(body);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function call(kind: string, init: RequestInit) {
    setBusy(kind);
    setError("");
    try {
      const res = await fetch(`/api/community/answers/${id}`, { ...init, headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        setEditing(false);
        setConfirming(false);
        router.refresh();
        setBusy(null);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "We couldn't save your changes. Please try again.");
    } catch {
      setError("We couldn't save your changes. Please try again.");
    }
    setBusy(null);
  }

  if (editing) {
    return (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const checked = validateAnswerBody(text);
          if (!checked.ok) return setError(checked.error);
          void call("save", { method: "PUT", body: JSON.stringify({ body: checked.body }) });
        }}
        className="mt-3 flex flex-col gap-2"
      >
        <label htmlFor={`ae-${id}`} className="sr-only">{tr("Your answer")}</label>
        <textarea id={`ae-${id}`} value={text} onChange={(e) => { setText(e.target.value); setError(""); }} maxLength={DISCUSSION_LIMITS.answerMax} rows={5} className="w-full rounded-xl border border-glass-border bg-black/30 px-3.5 py-2.5 text-base text-foreground outline-none focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm" />
        {error && <p role="alert" className="text-xs font-medium text-sakura">{tr(error)}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy === "save"} className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-azure to-neon-purple px-4 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {busy === "save" && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
            {tr("Save changes")}
          </button>
          <button type="button" onClick={() => { setEditing(false); setText(body); setError(""); }} className={btn}>{tr("Cancel")}</button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setEditing(true)} className={btn}><Pencil size={13} aria-hidden="true" />{tr("Edit")}</button>
        {!confirming && <button type="button" onClick={() => setConfirming(true)} className={btn}><Trash2 size={13} aria-hidden="true" />{tr("Delete")}</button>}
      </div>
      {confirming && (
        <div role="alertdialog" aria-label={tr("Delete this answer?")} className="rounded-2xl border border-sakura/40 bg-sakura/10 p-3">
          <p className="text-sm text-foreground">{tr("Delete this answer and the replies under it?")}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy === "delete"} onClick={() => call("delete", { method: "DELETE" })} className="inline-flex h-9 items-center gap-2 rounded-lg bg-sakura px-3 text-xs font-semibold text-background hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              {busy === "delete" && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
              {tr("Yes, delete")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={btn}>{tr("Keep it")}</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs font-medium text-sakura">{tr(error)}</p>}
    </div>
  );
}
