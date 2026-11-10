"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bookmark, Check, Share2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { useTranslate } from "@/lib/i18n/inline";

// Which of the posts on this page you have saved. One request covers the whole
// page (not one per card), and only your own saves are ever readable. Guests
// make no request at all.
const SavedContext = createContext<{ saved: ReadonlySet<string>; set: (id: string, on: boolean) => void } | null>(null);

export function FeedActionsProvider({ postIds, children }: { postIds: string[]; children: ReactNode }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set());
  const key = postIds.join(",");

  useEffect(() => {
    if (!user || postIds.length === 0) return;
    let active = true;
    createClient()
      .from("community_post_saves")
      .select("post_id")
      .in("post_id", postIds)
      .then(({ data }) => {
        if (active && data) setSaved(new Set(data.map((r) => r.post_id as string)));
      });
    return () => {
      active = false;
    };
    // `key` stands for the list of ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key]);

  const value = useMemo(
    () => ({
      saved: user ? saved : new Set<string>(),
      set: (id: string, on: boolean) =>
        setSaved((prev) => {
          const next = new Set(prev);
          if (on) next.add(id);
          else next.delete(id);
          return next;
        }),
    }),
    [saved, user],
  );
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

const btn = "relative z-10 inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60";
const idle = "border-glass-border bg-glass-bg text-foreground/90 hover:border-white/30 hover:text-foreground";

// Save and Share for one card. Saving needs an account (a guest gets the
// friendly sign-up card); the button updates at once and goes back if the
// database says no. Sharing opens the phone's share sheet or copies the link.
export default function PostCardActions({ postId, title, saves }: { postId: string; title: string; saves: number }) {
  const tr = useTranslate();
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const ctx = useContext(SavedContext);
  const [local, setLocal] = useState(false);
  const [count, setCount] = useState(saves);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const saved = ctx ? ctx.saved.has(postId) : local;
  const setSaved = (on: boolean) => (ctx ? ctx.set(postId, on) : setLocal(on));

  async function toggleSave() {
    if (!user) return requestAccount();
    if (busy) return;
    const was = saved;
    setBusy(true);
    setNote("");
    setSaved(!was);
    setCount((c) => Math.max(0, c + (was ? -1 : 1)));
    const db = createClient();
    const { error } = was ? await db.from("community_post_saves").delete().eq("post_id", postId).eq("user_id", user.id) : await db.from("community_post_saves").insert({ post_id: postId, user_id: user.id });
    if (error && error.code !== "23505") {
      setSaved(was);
      setCount((c) => Math.max(0, c + (was ? 1 : -1)));
      setNote("That didn't work. Please try again.");
    }
    setBusy(false);
  }

  async function share() {
    const url = `${window.location.origin}/community/post/${postId}`;
    setNote("");
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote("Link copied.");
      window.setTimeout(() => setNote((n) => (n === "Link copied." ? "" : n)), 2500);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setNote("Couldn't copy the link.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={toggleSave} aria-pressed={saved} aria-label={saved ? tr("Saved") : tr("Save")} disabled={busy} className={`${btn} ${saved ? "border-lilac/60 bg-lilac/15 text-lilac" : idle}`}>
        <Bookmark size={15} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
        <span className="hidden min-[400px]:inline">{saved ? tr("Saved") : tr("Save")}</span>
        <span className="tabular-nums text-foreground/70">{count > 0 ? count : ""}</span>
      </button>
      <button type="button" onClick={share} aria-label={tr("Share")} className={`${btn} ${idle}`}>
        {note === "Link copied." ? <Check size={15} aria-hidden="true" className="text-mint" /> : <Share2 size={15} aria-hidden="true" />}
        <span className="hidden min-[400px]:inline">{note === "Link copied." ? tr("Link copied.") : tr("Share")}</span>
      </button>
      <span role="status" aria-live="polite" className={note && note !== "Link copied." ? "min-w-0 text-[11px] leading-tight text-sakura" : "sr-only"}>
        {note && tr(note)}
      </span>
    </div>
  );
}
