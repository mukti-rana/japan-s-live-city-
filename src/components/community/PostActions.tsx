"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Flag, Heart, Link2, Loader2, Share2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { useTranslate } from "@/lib/i18n/inline";
import ReportDialog from "@/components/community/ReportDialog";

const btn = "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60";
const idle = "border-glass-border bg-glass-bg text-foreground hover:border-white/30";

// Like, save, share and report — and delete, for the author. Liking and saving
// need an account; a guest who tries gets the friendly sign-up card instead of
// an error. Counts shown are the real totals; the buttons update at once and
// quietly go back if the database says no (for example, too many too fast).
export default function PostActions({ postId, title, likes, saves, isOwner, path }: { postId: string; title: string; likes: number; saves: number; isOwner: boolean; path: string }) {
  const tr = useTranslate();
  const router = useRouter();
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [saveCount, setSaveCount] = useState(saves);
  const [busy, setBusy] = useState<"like" | "save" | "delete" | null>(null);
  const [note, setNote] = useState("");
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Whether *you* already liked or saved this (you can only ever read your own).
  useEffect(() => {
    if (!user) return;
    let active = true;
    const db = createClient();
    Promise.all([
      db.from("community_post_likes").select("post_id").eq("post_id", postId).maybeSingle(),
      db.from("community_post_saves").select("post_id").eq("post_id", postId).maybeSingle(),
    ]).then(([l, s]) => {
      if (!active) return;
      setLiked(Boolean(l.data));
      setSaved(Boolean(s.data));
    });
    return () => {
      active = false;
    };
  }, [user, postId]);

  async function toggle(kind: "like" | "save") {
    if (!user) return requestAccount();
    if (busy) return;
    const table = kind === "like" ? "community_post_likes" : "community_post_saves";
    const on = kind === "like" ? liked : saved;
    const set = kind === "like" ? setLiked : setSaved;
    const setCount = kind === "like" ? setLikeCount : setSaveCount;
    setBusy(kind);
    setNote("");
    set(!on);
    setCount((c) => Math.max(0, c + (on ? -1 : 1)));
    const db = createClient();
    const { error } = on ? await db.from(table).delete().eq("post_id", postId).eq("user_id", user.id) : await db.from(table).insert({ post_id: postId, user_id: user.id });
    // Already liked in another tab (duplicate) is fine — the state just matches reality.
    if (error && error.code !== "23505") {
      set(on);
      setCount((c) => Math.max(0, c + (on ? 1 : -1)));
      setNote(error.code === "P0001" ? error.message : "That didn't work. Please try again.");
    }
    setBusy(null);
  }

  async function share() {
    const url = `${window.location.origin}${path}`;
    setNote("");
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote("Link copied.");
    } catch (e) {
      // Closing the share sheet is not an error.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setNote("Couldn't copy the link. You can copy it from the address bar.");
    }
  }

  async function remove() {
    setBusy("delete");
    const res = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/community");
      router.refresh();
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setNote(data.error ?? "We couldn't delete that post. Please try again.");
    setConfirmDelete(false);
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => toggle("like")} aria-pressed={liked} disabled={busy === "like"} className={`${btn} ${liked ? "border-sakura/60 bg-sakura/15 text-sakura" : idle}`}>
          <Heart size={16} aria-hidden="true" fill={liked ? "currentColor" : "none"} />
          {tr("Like")} <span className="tabular-nums">{likeCount}</span>
        </button>
        <button type="button" onClick={() => toggle("save")} aria-pressed={saved} disabled={busy === "save"} className={`${btn} ${saved ? "border-lilac/60 bg-lilac/15 text-lilac" : idle}`}>
          <Bookmark size={16} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          {saved ? tr("Saved") : tr("Save")} <span className="tabular-nums">{saveCount}</span>
        </button>
        <button type="button" onClick={share} className={`${btn} ${idle}`}>
          <Share2 size={16} aria-hidden="true" />
          {tr("Share")}
        </button>
        {!isOwner && (
          <button type="button" onClick={() => (user ? setReporting(true) : requestAccount())} className={`${btn} ${idle}`}>
            <Flag size={16} aria-hidden="true" />
            {tr("Report")}
          </button>
        )}
        {isOwner && !confirmDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${btn} ${idle}`}>
            <Trash2 size={16} aria-hidden="true" />
            {tr("Delete")}
          </button>
        )}
      </div>

      {confirmDelete && (
        <div role="alertdialog" aria-label={tr("Delete this post?")} className="rounded-2xl border border-sakura/40 bg-sakura/10 p-4">
          <p className="text-sm text-foreground">{tr("Delete this post and its photos? This can't be undone.")}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={remove} disabled={busy === "delete"} className="inline-flex items-center gap-2 rounded-xl bg-sakura px-4 py-2 text-sm font-semibold text-background hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              {busy === "delete" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {tr("Yes, delete")}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={`${btn} h-9 ${idle}`}>
              {tr("Keep it")}
            </button>
          </div>
        </div>
      )}

      <p aria-live="polite" className="min-h-4 text-xs text-foreground/80">
        {note && (
          <>
            {note === "Link copied." && <Link2 size={12} aria-hidden="true" className="mr-1 inline" />}
            {tr(note)}
          </>
        )}
      </p>
      {reporting && <ReportDialog postId={postId} onClose={() => setReporting(false)} />}
    </div>
  );
}
