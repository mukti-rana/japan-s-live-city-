"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";
import { DISCUSSION_LIMITS, validateQuestionFields, type QuestionErrors } from "@/lib/community/validation";

const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-glass-border bg-glass-bg px-3 text-xs font-medium text-foreground transition-colors hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60";
const input = "w-full rounded-xl border border-glass-border bg-black/30 px-3.5 text-base text-foreground outline-none focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm";

// What the asker can do: mark the question resolved (or open it again), edit it
// and delete it.
export default function QuestionOwnerTools({ id, title, body, resolved }: { id: string; title: string; body: string; resolved: boolean }) {
  const tr = useTranslate();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [t, setT] = useState(title);
  const [b, setB] = useState(body);
  const [errors, setErrors] = useState<QuestionErrors>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ResolveIcon = resolved ? RotateCcw : CheckCircle2;

  async function call(kind: string, init: RequestInit, onOk: () => void) {
    setBusy(kind);
    setError("");
    try {
      const res = await fetch(`/api/community/questions/${id}`, { ...init, headers: { "Content-Type": "application/json" } });
      if (res.ok) return onOk();
      const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: QuestionErrors };
      if (data.fields) setErrors(data.fields);
      setError(data.error ?? "We couldn't save your changes. Please try again.");
    } catch {
      setError("We couldn't save your changes. Please try again.");
    }
    setBusy(null);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const checked = validateQuestionFields({ title: t, body: b, areaId: "tokyo", placeRef: "" });
    if (!checked.ok) return setErrors(checked.errors);
    setErrors({});
    void call("save", { method: "PUT", body: JSON.stringify({ title: checked.value.title, body: checked.value.body }) }, () => {
      setEditing(false);
      setBusy(null);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form onSubmit={save} noValidate className="flex flex-col gap-3 rounded-2xl border border-glass-border bg-glass-bg p-4">
        <div>
          <label htmlFor="qe-title" className="mb-1 block text-xs font-semibold text-foreground">{tr("Your question")}</label>
          <input id="qe-title" value={t} onChange={(e) => setT(e.target.value)} maxLength={DISCUSSION_LIMITS.questionTitleMax} className={`${input} h-11`} aria-invalid={errors.title ? true : undefined} />
          {errors.title && <p role="alert" className="mt-1 text-xs font-medium text-sakura">{tr(errors.title)}</p>}
        </div>
        <div>
          <label htmlFor="qe-body" className="mb-1 block text-xs font-semibold text-foreground">{tr("Details")}</label>
          <textarea id="qe-body" value={b} onChange={(e) => setB(e.target.value)} maxLength={DISCUSSION_LIMITS.questionBodyMax} rows={4} className={`${input} py-2.5`} aria-invalid={errors.body ? true : undefined} />
          {errors.body && <p role="alert" className="mt-1 text-xs font-medium text-sakura">{tr(errors.body)}</p>}
        </div>
        {error && <p role="alert" className="text-xs font-medium text-sakura">{tr(error)}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy === "save"} className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-azure to-neon-purple px-4 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {busy === "save" && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
            {tr("Save changes")}
          </button>
          <button type="button" onClick={() => setEditing(false)} className={btn}>{tr("Cancel")}</button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy === "resolve"} onClick={() => call("resolve", { method: "PUT", body: JSON.stringify({ resolved: !resolved }) }, () => { setBusy(null); router.refresh(); })} className={btn}>
          {busy === "resolve" ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <ResolveIcon size={13} aria-hidden="true" />}
          {resolved ? tr("Reopen question") : tr("Mark as resolved")}
        </button>
        <button type="button" onClick={() => setEditing(true)} className={btn}><Pencil size={13} aria-hidden="true" />{tr("Edit")}</button>
        {!confirming && <button type="button" onClick={() => setConfirming(true)} className={btn}><Trash2 size={13} aria-hidden="true" />{tr("Delete")}</button>}
      </div>
      {confirming && (
        <div role="alertdialog" aria-label={tr("Delete this question?")} className="rounded-2xl border border-sakura/40 bg-sakura/10 p-3">
          <p className="text-sm text-foreground">{tr("Delete this question and all its answers? This can't be undone.")}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy === "delete"} onClick={() => call("delete", { method: "DELETE" }, () => { router.push("/community/questions"); router.refresh(); })} className="inline-flex h-9 items-center gap-2 rounded-lg bg-sakura px-3 text-xs font-semibold text-background hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
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
