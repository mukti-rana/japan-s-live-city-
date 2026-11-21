"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, EyeOff, Loader2, Pencil } from "lucide-react";
import type { ListingStatus } from "@/lib/community/listings/types";
import { useTranslate } from "@/lib/i18n/inline";

const btn = "inline-flex h-10 items-center gap-2 rounded-full border border-white/30 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50";

// What the author of a listing sees on their own listing's page: its state in plain words, and what they can do about it. Every action is the
// server's (and the database's) to allow; this only asks.
export default function OwnerControls({ id, status, holdReason }: { id: string; status: ListingStatus; holdReason: string | null }) {
  const tr = useTranslate();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function call(what: string, url: string, init: RequestInit) {
    setBusy(what);
    setError("");
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "That didn't work. Please try again.");
        return false;
      }
      return true;
    } finally {
      setBusy(null);
    }
  }
  const state = async (action: string, extra: object = {}) => {
    if (await call(action, `/api/community/listings/${id}/state`, { method: "POST", body: JSON.stringify({ action, ...extra }) })) {
      setCancelling(false);
      router.refresh();
    }
  };
  const publish = async () => {
    if (await call("publish", `/api/community/listings/${id}/submit`, { method: "POST", body: "{}" })) router.refresh();
  };
  const remove = async () => {
    if (await call("delete", `/api/community/listings/${id}`, { method: "DELETE" })) router.push("/community/me?tab=listings");
  };

  const banner = {
    draft: { icon: Pencil, tone: "border-white/25 text-white", text: "This is a private draft. Only you can see it." },
    pending: { icon: Clock, tone: "border-[#ffc26b]/50 text-[#ffd9a0]", text: "Waiting for a moderator to review it. Only you can see it until then." },
    rejected: { icon: AlertTriangle, tone: "border-[#ff7a7a]/50 text-[#ffb0b0]", text: "A moderator didn't approve this. You can edit it and publish it again." },
    hidden: { icon: EyeOff, tone: "border-[#ff7a7a]/50 text-[#ffb0b0]", text: "A moderator has hidden this. Only you and moderators can see it." },
    published: { icon: CheckCircle2, tone: "border-[#4ade80]/40 text-[#9bf3b6]", text: "This is live. Anyone can see it." },
    cancelled: { icon: AlertTriangle, tone: "border-[#ff7a7a]/50 text-[#ffb0b0]", text: "You cancelled this. It stays visible, marked as cancelled." },
    expired: { icon: Clock, tone: "border-white/25 text-white/80", text: "This has finished. It stays visible as a past listing." },
  }[status];
  const Icon = banner.icon;

  return (
    <section aria-label={tr("Your publication")} className={`flex flex-col gap-3 rounded-2xl border bg-white/[0.03] p-4 ${banner.tone}`}>
      <p className="flex items-start gap-2 text-sm font-medium">
        <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>
          {tr(banner.text)}
          {holdReason && (status === "pending" || status === "rejected") ? <span className="mt-1 block font-normal opacity-80">{tr("Why it was held")}: {holdReason}</span> : null}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {status !== "hidden" && (
          <Link href={`/community/listing/${id}/edit`} className={btn}>
            <Pencil size={14} aria-hidden="true" />
            {tr("Edit")}
          </Link>
        )}
        {(status === "draft" || status === "rejected") && (
          <button type="button" disabled={busy !== null} onClick={publish} className={`${btn} border-white/60 bg-white/10`}>
            {busy === "publish" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {tr("Publish")}
          </button>
        )}
        {status === "published" && !cancelling && (
          <button type="button" onClick={() => setCancelling(true)} className={btn}>
            {tr("Cancel this event")}
          </button>
        )}
        {status === "cancelled" && (
          <button type="button" disabled={busy !== null} onClick={() => state("resume")} className={btn}>
            {tr("Resume")}
          </button>
        )}
        {(status === "published" || status === "pending" || status === "cancelled") && (
          <button type="button" disabled={busy !== null} onClick={() => state("withdraw")} className={btn}>
            {tr("Withdraw to draft")}
          </button>
        )}
        {status !== "pending" && status !== "hidden" && !confirmDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${btn} border-[#ff7a7a]/40 text-[#ffb0b0]`}>
            {tr("Delete")}
          </button>
        )}
      </div>
      {cancelling && (
        <div className="flex flex-col gap-2 rounded-xl border border-white/15 p-3">
          <label className="text-xs font-medium text-white/70" htmlFor="cancel-note">
            {tr("Tell people why (optional, up to 300 characters)")}
          </label>
          <textarea id="cancel-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={2} className="w-full rounded-xl border border-white/20 bg-transparent p-3 text-sm text-white outline-none focus:border-white/50" />
          <div className="flex gap-2">
            <button type="button" disabled={busy !== null} onClick={() => state("cancel", { note })} className={`${btn} border-[#ff7a7a]/50 text-[#ffb0b0]`}>
              {busy === "cancel" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {tr("Yes, cancel it")}
            </button>
            <button type="button" onClick={() => setCancelling(false)} className={btn}>
              {tr("Keep it")}
            </button>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div role="alertdialog" aria-label={tr("Delete this publication?")} className="flex flex-col gap-2 rounded-xl border border-[#ff7a7a]/40 p-3">
          <p className="text-sm text-white">{tr("Delete this publication for good? This can't be undone.")}</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy !== null} onClick={remove} className={`${btn} border-[#ff7a7a]/50 text-[#ffb0b0]`}>
              {busy === "delete" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {tr("Yes, delete")}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={btn}>
              {tr("Keep it")}
            </button>
          </div>
        </div>
      )}
      <p role="alert" className="min-h-4 text-xs text-[#ffb0b0]">
        {error && tr(error)}
      </p>
    </section>
  );
}
