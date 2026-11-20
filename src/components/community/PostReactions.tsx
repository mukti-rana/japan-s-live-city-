"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bookmark, Check, Heart, MessageCircle, Share2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { useTranslate } from "@/lib/i18n/inline";

// Like, save and share for the posts on one page (the feed and the gallery). They are the same actions, on the same tables, with the same rules as
// the buttons on the post's own page (PostActions): liking and saving need an account (a guest gets the friendly sign-up card); a button changes at
// once and goes back if the database says no; the counts are the real totals. One provider reads *your own* likes and saves for the whole page in two
// requests (not two per post), and a guest makes none. Nothing about the database, its policies or the post page changes.
type Kind = "like" | "save";
interface Totals {
  likes: number;
  saves: number;
}
interface Ctx {
  liked: ReadonlySet<string>;
  saved: ReadonlySet<string>;
  totals: Record<string, Totals>;
  busy: string | null;
  notes: Record<string, string>;
  toggle: (postId: string, kind: Kind) => Promise<void>;
  share: (postId: string, title: string) => Promise<void>;
}
const ReactionCtx = createContext<Ctx | null>(null);
// What a guest has liked and saved: nothing.
const NONE: ReadonlySet<string> = new Set();

export function ReactionsProvider({ posts, children }: { posts: { id: string; likeCount: number; saveCount: number }[]; children: ReactNode }) {
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const [liked, setLiked] = useState<ReadonlySet<string>>(new Set());
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set());
  const [totals, setTotals] = useState<Record<string, Totals>>(() => Object.fromEntries(posts.map((p) => [p.id, { likes: p.likeCount, saves: p.saveCount }])));
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const ids = posts.map((p) => p.id);
  const key = ids.join(",");
  const noteTimer = useRef<number | undefined>(undefined);

  // Your own likes and saves among these posts (RLS lets you read only your own).
  useEffect(() => {
    if (!user || ids.length === 0) return;
    let live = true;
    const db = createClient();
    Promise.all([db.from("community_post_likes").select("post_id").in("post_id", ids), db.from("community_post_saves").select("post_id").in("post_id", ids)]).then(([l, s]) => {
      if (!live) return;
      if (l.data) setLiked(new Set(l.data.map((r) => r.post_id as string)));
      if (s.data) setSaved(new Set(s.data.map((r) => r.post_id as string)));
    });
    return () => {
      live = false;
    };
    // `key` stands for the list of ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key]);

  const note = useCallback((id: string, text: string, ms = 0) => {
    setNotes((n) => ({ ...n, [id]: text }));
    window.clearTimeout(noteTimer.current);
    if (ms) noteTimer.current = window.setTimeout(() => setNotes((n) => ({ ...n, [id]: "" })), ms);
  }, []);

  const toggle = useCallback(
    async (postId: string, kind: Kind) => {
      if (!user) return requestAccount();
      if (busy) return;
      const table = kind === "like" ? "community_post_likes" : "community_post_saves";
      const set = kind === "like" ? setLiked : setSaved;
      const on = (kind === "like" ? liked : saved).has(postId);
      const bump = (d: number) => setTotals((t) => ({ ...t, [postId]: { ...t[postId], [kind === "like" ? "likes" : "saves"]: Math.max(0, (t[postId]?.[kind === "like" ? "likes" : "saves"] ?? 0) + d) } }));
      const flip = (to: boolean) =>
        set((prev) => {
          const next = new Set(prev);
          if (to) next.add(postId);
          else next.delete(postId);
          return next;
        });
      setBusy(postId + kind);
      note(postId, "");
      flip(!on);
      bump(on ? -1 : 1);
      const db = createClient();
      const { error } = on ? await db.from(table).delete().eq("post_id", postId).eq("user_id", user.id) : await db.from(table).insert({ post_id: postId, user_id: user.id });
      // Already done in another tab (duplicate) is fine: the state just matches reality.
      if (error && error.code !== "23505") {
        flip(on);
        bump(on ? 1 : -1);
        note(postId, error.code === "P0001" ? error.message : "That didn't work. Please try again.");
      }
      setBusy(null);
    },
    [user, requestAccount, busy, liked, saved, note],
  );

  const share = useCallback(
    async (postId: string, title: string) => {
      const url = `${window.location.origin}/community/post/${postId}`;
      note(postId, "");
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        note(postId, "Link copied.", 2500);
      } catch (e) {
        // Closing the share sheet is not an error.
        if (e instanceof DOMException && e.name === "AbortError") return;
        note(postId, "Couldn't copy the link.", 3500);
      }
    },
    [note],
  );

  const value = useMemo(() => ({ liked: user ? liked : NONE, saved: user ? saved : NONE, totals, busy, notes, toggle, share }), [liked, saved, totals, busy, notes, toggle, share, user]);
  return <ReactionCtx.Provider value={value}>{children}</ReactionCtx.Provider>;
}

function useReactions(): Ctx {
  const c = useContext(ReactionCtx);
  if (!c) throw new Error("ReactionsProvider is missing");
  return c;
}

const base = "relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60";

// The row under a post in the feed: Like, Comment (opens the post at its comments), Save, and Share.
export function FeedPostActions({ postId, title, comments }: { postId: string; title: string; comments: number }) {
  const tr = useTranslate();
  const r = useReactions();
  const isLiked = r.liked.has(postId);
  const isSaved = r.saved.has(postId);
  const t = r.totals[postId] ?? { likes: 0, saves: 0 };
  const note = r.notes[postId];
  return (
    <div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => r.toggle(postId, "like")} aria-pressed={isLiked} aria-label={tr("Like")} className={`${base} ${isLiked ? "text-[#ff5c93]" : "text-foreground/80 hover:bg-white/[0.07] hover:text-white"}`}>
          <Heart key={String(isLiked)} size={20} aria-hidden="true" fill={isLiked ? "currentColor" : "none"} className={isLiked ? "cm-heart-pop" : ""} />
          <span className="tabular-nums">{t.likes}</span>
        </button>
        <Link href={`/community/post/${postId}#comments`} aria-label={tr("Comments")} className={`${base} text-foreground/80 hover:bg-white/[0.07] hover:text-white`}>
          <MessageCircle size={20} aria-hidden="true" />
          <span className="tabular-nums">{comments}</span>
        </Link>
        <button type="button" onClick={() => r.share(postId, title)} aria-label={tr("Share")} className={`${base} text-foreground/80 hover:bg-white/[0.07] hover:text-white`}>
          {note === "Link copied." ? <Check size={20} aria-hidden="true" className="text-mint" /> : <Share2 size={20} aria-hidden="true" />}
          {note === "Link copied." && <span className="text-xs">{tr("Link copied.")}</span>}
        </button>
        <button type="button" onClick={() => r.toggle(postId, "save")} aria-pressed={isSaved} aria-label={isSaved ? tr("Saved") : tr("Save")} className={`${base} ml-auto ${isSaved ? "text-[#ffb74d]" : "text-foreground/80 hover:bg-white/[0.07] hover:text-white"}`}>
          <Bookmark key={String(isSaved)} size={20} aria-hidden="true" fill={isSaved ? "currentColor" : "none"} className={isSaved ? "cm-heart-pop" : ""} />
          <span className="tabular-nums">{t.saves > 0 ? t.saves : ""}</span>
        </button>
      </div>
      <p role="status" aria-live="polite" className={note && note !== "Link copied." ? "px-3 pt-1 text-xs text-sakura" : "sr-only"}>
        {note && note !== "Link copied." ? tr(note) : ""}
      </p>
    </div>
  );
}

// The two small round buttons on a gallery photo: like and save. They sit over the photo, clear of the link that opens the post.
export function TileActions({ postId }: { postId: string }) {
  const tr = useTranslate();
  const r = useReactions();
  const isLiked = r.liked.has(postId);
  const isSaved = r.saved.has(postId);
  const round = "relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => r.toggle(postId, "like")} aria-pressed={isLiked} aria-label={tr("Like")} className={`${round} ${isLiked ? "text-[#ff5c93]" : ""}`}>
        <Heart key={String(isLiked)} size={16} aria-hidden="true" fill={isLiked ? "currentColor" : "none"} className={isLiked ? "cm-heart-pop" : ""} />
      </button>
      <button type="button" onClick={() => r.toggle(postId, "save")} aria-pressed={isSaved} aria-label={isSaved ? tr("Saved") : tr("Save")} className={`${round} ${isSaved ? "text-[#ffb74d]" : ""}`}>
        <Bookmark key={String(isSaved)} size={16} aria-hidden="true" fill={isSaved ? "currentColor" : "none"} className={isSaved ? "cm-heart-pop" : ""} />
      </button>
    </div>
  );
}

// The real like count, for a gallery tile (it follows a like made here).
export function LikeCount({ postId }: { postId: string }) {
  const r = useReactions();
  return <span className="tabular-nums">{r.totals[postId]?.likes ?? 0}</span>;
}
