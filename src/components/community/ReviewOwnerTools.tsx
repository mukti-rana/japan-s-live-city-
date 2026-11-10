"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";
import ReviewForm, { type ReviewDraft } from "@/components/community/ReviewForm";

const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-glass-border bg-glass-bg px-3 text-xs font-medium text-foreground transition-colors hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60";

// Edit and delete for the author of a review (shown only on their own).
export default function ReviewOwnerTools({ placeRef, draft }: { placeRef: string; draft: ReviewDraft }) {
  const tr = useTranslate();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/community/reviews/${draft.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "We couldn't delete that review. Please try again.");
    setConfirming(false);
    setBusy(false);
  }

  if (editing) {
    return (
      <div className="mt-4">
        <ReviewForm placeRef={placeRef} draft={draft} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setEditing(true)} className={btn}>
          <Pencil size={13} aria-hidden="true" />
          {tr("Edit")}
        </button>
        {!confirming && (
          <button type="button" onClick={() => setConfirming(true)} className={btn}>
            <Trash2 size={13} aria-hidden="true" />
            {tr("Delete")}
          </button>
        )}
      </div>
      {confirming && (
        <div role="alertdialog" aria-label={tr("Delete this review?")} className="rounded-2xl border border-sakura/40 bg-sakura/10 p-3">
          <p className="text-sm text-foreground">{tr("Delete this review and its photos? This can't be undone.")}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={remove} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-sakura px-3 text-xs font-semibold text-background hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
              {tr("Yes, delete")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={btn}>
              {tr("Keep it")}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-sakura">
          {tr(error)}
        </p>
      )}
    </div>
  );
}
