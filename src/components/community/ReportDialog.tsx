"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/lib/i18n/inline";
import { REPORT_REASONS, type ReportReason } from "@/lib/community/validation";

const REASON_TEXT: Record<ReportReason, string> = {
  inappropriate: "Inappropriate photo or content",
  fake: "Fake or made-up",
  spam: "Spam or advertising",
  harassment: "Harassment or hate",
  misleading: "Misleading information",
  copyright: "Copyright concern",
  unsafe: "Unsafe or illegal",
};

// "Report this post": pick why, add a note if you like. Reports go to the
// moderators; the person who posted is never told who reported.
export default function ReportDialog({ postId, onClose }: { postId: string; onClose: () => void }) {
  const tr = useTranslate();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || state === "sending") return;
    setState("sending");
    const { data: auth } = await createClient().auth.getUser();
    if (!auth.user) {
      setError("Please sign in to report.");
      setState("error");
      return;
    }
    const { error: dbError } = await createClient()
      .from("community_reports")
      .insert({ reporter_id: auth.user.id, target_type: "post", target_id: postId, reason, details: details.trim().slice(0, 1000) || null });
    if (!dbError) return setState("done");
    setError(dbError.code === "23505" ? "You've already reported this post. Thank you." : dbError.code === "P0001" ? dbError.message : "We couldn't send your report. Please try again.");
    setState("error");
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="report-h" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-glass-border bg-panel p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="report-h" className="text-lg font-semibold text-foreground">
          {tr("Report this post")}
        </h2>
        {state === "done" ? (
          <>
            <p role="status" className="mt-3 text-sm text-foreground/90">
              {tr("Thank you. Our moderators will take a look.")}
            </p>
            <button type="button" onClick={onClose} className="mt-5 rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              {tr("Close")}
            </button>
          </>
        ) : (
          <form onSubmit={send} className="mt-3 flex flex-col gap-3">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-xs font-medium text-foreground/85">{tr("What's wrong?")}</legend>
              {REPORT_REASONS.map((r, i) => (
                <label key={r} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-white/5">
                  <input ref={i === 0 ? first : undefined} type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 accent-[#c4b5fd]" />
                  {tr(REASON_TEXT[r])}
                </label>
              ))}
            </fieldset>
            <label className="text-xs font-medium text-foreground/85">
              {tr("More details")} ({tr("optional")})
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} className="mt-1.5 w-full rounded-xl border border-glass-border bg-black/30 px-3 py-2 text-base text-foreground outline-none focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm" />
            </label>
            {state === "error" && (
              <p role="alert" className="text-xs font-medium text-sakura">
                {tr(error)}
              </p>
            )}
            <div className="mt-1 flex gap-3">
              <button type="submit" disabled={!reason || state === "sending"} className="rounded-xl bg-gradient-to-r from-sakura to-lilac px-5 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                {state === "sending" ? tr("Sending…") : tr("Send report")}
              </button>
              <button type="button" onClick={onClose} className="rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                {tr("Cancel")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
