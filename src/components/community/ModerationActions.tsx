"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";
import type { Action, Target } from "@/lib/community/moderation";

const TONE = {
  neutral: "border-glass-border bg-glass-bg text-foreground hover:border-white/30",
  good: "border-mint/50 bg-mint/10 text-mint hover:bg-mint/20",
  warn: "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20",
  bad: "border-sakura/50 bg-sakura/10 text-sakura hover:bg-sakura/20",
} as const;

export interface ActionSpec {
  action: Action;
  label: string;
  tone: keyof typeof TONE;
  // Needs a second click to confirm (for things that cannot be undone).
  confirm?: string;
}

const btn = "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60";

// The buttons for one item in the moderation queue. Each sends one action to
// the server (which checks that you are a moderator) and then refreshes the
// page so the item moves out of the list. "Suspend" asks for a length and an
// optional reason first; "Delete" asks you to confirm.
export default function ModerationActions({ targetType, targetId, actions }: { targetType: Target; targetId: string; actions: ActionSpec[] }) {
  const tr = useTranslate();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function send(action: Action, extra: { days?: number | null; note?: string } = {}) {
    setBusy(action);
    setError("");
    try {
      const res = await fetch("/api/community/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetType, targetId, note: extra.note ?? "", days: extra.days ?? null }),
      });
      if (res.ok) {
        setConfirming(null);
        setSuspending(false);
        start(() => router.refresh());
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "That didn't work. Please try again.");
    } catch {
      setError("That didn't work. Please try again.");
    }
    setBusy(null);
  }

  const disabled = busy !== null || pending;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const isConfirming = confirming === a.action;
          return (
            <button
              key={a.action}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (a.action === "suspend") return setSuspending((v) => !v);
                if (a.confirm && !isConfirming) return setConfirming(a.action);
                void send(a.action);
              }}
              className={`${btn} ${TONE[isConfirming ? "bad" : a.tone]}`}
            >
              {busy === a.action && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
              {isConfirming ? tr(a.confirm!) : tr(a.label)}
            </button>
          );
        })}
        {confirming && (
          <button type="button" onClick={() => setConfirming(null)} className={`${btn} ${TONE.neutral}`}>
            {tr("Cancel")}
          </button>
        )}
      </div>

      {suspending && (
        <div className="flex flex-col gap-2 rounded-2xl border border-gold/40 bg-gold/5 p-3 sm:flex-row sm:items-end">
          <label className="text-xs font-medium text-foreground">
            {tr("Suspend for")}
            <select value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-glass-border bg-black/40 px-3 text-base text-foreground sm:w-44 sm:text-sm">
              <option value="7">{tr("7 days")}</option>
              <option value="30">{tr("30 days")}</option>
              <option value="90">{tr("90 days")}</option>
              <option value="">{tr("Until lifted")}</option>
            </select>
          </label>
          <label className="min-w-0 flex-1 text-xs font-medium text-foreground">
            {tr("Reason (for the log)")}
            <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-glass-border bg-black/40 px-3 text-base text-foreground sm:text-sm" />
          </label>
          <button type="button" disabled={disabled} onClick={() => send("suspend", { days: days ? Number(days) : null, note })} className={`${btn} ${TONE.bad}`}>
            {busy === "suspend" && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
            {tr("Suspend")}
          </button>
        </div>
      )}

      <p role="status" aria-live="polite" className="min-h-4 text-xs text-sakura">
        {error && tr(error)}
      </p>
    </div>
  );
}
