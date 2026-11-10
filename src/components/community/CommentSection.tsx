"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { useTranslate } from "@/lib/i18n/inline";
import { DISCUSSION_LIMITS, validateCommentBody } from "@/lib/community/validation";
import type { CommunityComment } from "@/lib/community/types";
import LocalDate from "@/components/community/LocalDate";
import ReportButton from "@/components/community/ReportButton";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const small = `inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground/85 transition-colors hover:text-foreground ${ring}`;
const field = "w-full rounded-xl border border-glass-border bg-black/30 px-3.5 py-2.5 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm";

type Target = { type: "post" | "answer"; id: string };

// A box for writing a comment or a reply (or editing one). It checks the words
// with the same rules as the server, says what is wrong in plain language, and
// refreshes the page's data when done.
function Composer({ target, parentId, initial, editId, onDone, onCancel, autoFocus, placeholder, submitLabel }: { target: Target; parentId?: string | null; initial?: string; editId?: string; onDone: () => void; onCancel?: () => void; autoFocus?: boolean; placeholder: string; submitLabel: string }) {
  const tr = useTranslate();
  const router = useRouter();
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const [text, setText] = useState(initial ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!user) return requestAccount();
    const checked = validateCommentBody(text);
    if (!checked.ok) return setError(checked.error);
    setBusy(true);
    setError("");
    try {
      const res = await fetch(editId ? `/api/community/comments/${editId}` : "/api/community/comments", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { body: checked.body } : { targetType: target.type, targetId: target.id, parentId: parentId ?? null, body: checked.body }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setText("");
        router.refresh();
        onDone();
        setBusy(false);
        return;
      }
      setError(data.error ?? "We couldn't post your comment. Please try again.");
    } catch {
      setError("We couldn't post your comment. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <label className="sr-only" htmlFor={`c-${editId ?? parentId ?? target.id}`}>
        {placeholder}
      </label>
      <textarea
        id={`c-${editId ?? parentId ?? target.id}`}
        value={text}
        onChange={(e) => { setText(e.target.value); if (error) setError(""); }}
        onFocus={() => { if (!user) requestAccount(); }}
        rows={editId || parentId ? 2 : 3}
        maxLength={DISCUSSION_LIMITS.commentMax}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={field}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy || !text.trim()} className={`inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-azure to-neon-purple px-4 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50 ${ring}`}>
          {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className={small}>
            {tr("Cancel")}
          </button>
        )}
        <span className="ml-auto text-[11px] tabular-nums text-foreground/70">
          {text.length} / {DISCUSSION_LIMITS.commentMax}
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

function Item({ c, children, target, liked, onToggleLike, replying, setReplying, editing, setEditing, canReply, deleteComment, busyId, error }: {
  c: CommunityComment;
  children: React.ReactNode;
  target: Target;
  liked: boolean;
  onToggleLike: () => void;
  replying: string | null;
  setReplying: (id: string | null) => void;
  editing: string | null;
  setEditing: (id: string | null) => void;
  canReply: boolean;
  deleteComment: (id: string) => void;
  busyId: string | null;
  error: string;
}) {
  const tr = useTranslate();
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex gap-3">
      {c.author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.author.avatarUrl} alt="" loading="lazy" decoding="async" className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lilac/20 text-sm font-semibold uppercase text-lilac">
          {c.author.username.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium text-foreground">{c.author.username}</span>
          {c.isMine && <span className="ml-2 rounded-full bg-lilac/20 px-2 py-0.5 text-[10px] font-semibold text-lilac">{tr("You")}</span>}
          <span className="ml-2 text-xs text-foreground/70">
            <LocalDate iso={c.createdAt} />
            {c.edited && <> · {tr("edited")}</>}
          </span>
        </p>

        {editing === c.id ? (
          <div className="mt-1.5">
            <Composer target={target} editId={c.id} initial={c.body} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} autoFocus placeholder={tr("Edit your comment")} submitLabel={tr("Save changes")} />
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/95">{c.body}</p>
        )}

        {editing !== c.id && (
          <div className="mt-1 flex flex-wrap items-center gap-0.5">
            <button type="button" onClick={onToggleLike} aria-pressed={liked} className={`${small} ${liked ? "text-sakura" : ""}`}>
              <Heart size={13} aria-hidden="true" fill={liked ? "currentColor" : "none"} />
              <span className="tabular-nums">{c.likeCount}</span>
              <span className="sr-only">{tr("Like")}</span>
            </button>
            {canReply && c.depth < 2 && (
              <button type="button" onClick={() => setReplying(replying === c.id ? null : c.id)} aria-expanded={replying === c.id} className={small}>
                <MessageCircle size={13} aria-hidden="true" />
                {tr("Reply")}
              </button>
            )}
            {c.isMine ? (
              <>
                <button type="button" onClick={() => setEditing(c.id)} className={small}>
                  <Pencil size={13} aria-hidden="true" />
                  {tr("Edit")}
                </button>
                {!confirming && (
                  <button type="button" onClick={() => setConfirming(true)} className={small}>
                    <Trash2 size={13} aria-hidden="true" />
                    {tr("Delete")}
                  </button>
                )}
              </>
            ) : (
              <ReportButton targetType="comment" targetId={c.id} />
            )}
          </div>
        )}

        {confirming && (
          <div role="alertdialog" aria-label={tr("Delete this comment?")} className="mt-1 rounded-xl border border-sakura/40 bg-sakura/10 p-3">
            <p className="text-sm text-foreground">{tr("Delete this comment and the replies under it?")}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => deleteComment(c.id)} disabled={busyId === c.id} className="inline-flex h-8 items-center gap-2 rounded-lg bg-sakura px-3 text-xs font-semibold text-background hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                {busyId === c.id && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
                {tr("Yes, delete")}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={small}>
                {tr("Keep it")}
              </button>
            </div>
            {error && <p role="alert" className="mt-2 text-xs font-medium text-sakura">{tr(error)}</p>}
          </div>
        )}

        {replying === c.id && (
          <div className="mt-2">
            <Composer target={target} parentId={c.id} onDone={() => setReplying(null)} onCancel={() => setReplying(null)} autoFocus placeholder={tr("Write a reply…")} submitLabel={tr("Reply")} />
          </div>
        )}
        {children}
      </div>
    </li>
  );
}

// Comments on a photo post, or replies under an answer. Top-level comments can be
// shown newest first or by most-liked; replies stay in the order written, up to
// three levels deep. Everyone can read; writing, liking and replying need an
// account (guests get the friendly sign-up card). Counts and likes are real.
export default function CommentSection({ target, comments, collapsible = false, canComment = true }: { target: Target; comments: CommunityComment[]; collapsible?: boolean; canComment?: boolean }) {
  const tr = useTranslate();
  const router = useRouter();
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const [sort, setSort] = useState<"newest" | "top">("newest");
  const [open, setOpen] = useState(!collapsible);
  const [replying, setReplying] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeOverride, setLikeOverride] = useState<Record<string, boolean>>({});
  const [likeDelta, setLikeDelta] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const ids = useMemo(() => comments.map((c) => c.id).join(","), [comments]);

  // Which of these comments you have liked (you can only read your own likes).
  useEffect(() => {
    if (!user || !ids) return;
    let active = true;
    createClient()
      .from("community_comment_likes")
      .select("comment_id")
      .in("comment_id", ids.split(","))
      .then(({ data }) => {
        if (active && data) setLikedIds(new Set(data.map((r) => r.comment_id as string)));
      });
    return () => {
      active = false;
    };
  }, [user, ids]);

  const tree = useMemo(() => {
    const byParent = new Map<string | null, CommunityComment[]>();
    for (const c of comments) {
      const k = c.parentId;
      byParent.set(k, [...(byParent.get(k) ?? []), c]);
    }
    const top = [...(byParent.get(null) ?? [])];
    top.sort(sort === "top" ? (a, b) => b.likeCount - a.likeCount || +new Date(b.createdAt) - +new Date(a.createdAt) : (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return { top, kids: (id: string) => byParent.get(id) ?? [] };
  }, [comments, sort]);

  async function toggleLike(c: CommunityComment) {
    if (!user) return requestAccount();
    const on = likeOverride[c.id] ?? likedIds.has(c.id);
    setNote("");
    setLikeOverride((m) => ({ ...m, [c.id]: !on }));
    setLikeDelta((m) => ({ ...m, [c.id]: (m[c.id] ?? 0) + (on ? -1 : 1) }));
    const db = createClient();
    const { error: dbError } = on ? await db.from("community_comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id) : await db.from("community_comment_likes").insert({ comment_id: c.id, user_id: user.id });
    if (dbError && dbError.code !== "23505") {
      setLikeOverride((m) => ({ ...m, [c.id]: on }));
      setLikeDelta((m) => ({ ...m, [c.id]: (m[c.id] ?? 0) + (on ? 1 : -1) }));
      setNote(dbError.code === "P0001" ? dbError.message : "That didn't work. Please try again.");
    }
  }

  async function deleteComment(id: string) {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/community/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      setBusyId(null);
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "We couldn't delete that comment. Please try again.");
    setBusyId(null);
  }

  function render(c: CommunityComment): React.ReactNode {
    const kids = tree.kids(c.id);
    const liked = likeOverride[c.id] ?? likedIds.has(c.id);
    return (
      <Item key={c.id} c={{ ...c, likeCount: Math.max(0, c.likeCount + (likeDelta[c.id] ?? 0)) }} target={target} liked={liked} onToggleLike={() => toggleLike(c)} replying={replying} setReplying={setReplying} editing={editing} setEditing={setEditing} canReply={canComment} deleteComment={deleteComment} busyId={busyId} error={error}>
        {kids.length > 0 && <ul className="mt-3 flex flex-col gap-3 border-l border-glass-border pl-3 sm:pl-4">{kids.map(render)}</ul>}
      </Item>
    );
  }

  const label = comments.length === 0 ? tr("Replies") : `${tr("Replies")} (${comments.length})`;

  return (
    <section aria-label={tr("Comments")} className="flex flex-col gap-4">
      {collapsible && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`${small} w-fit`}>
          <MessageCircle size={13} aria-hidden="true" />
          {open ? tr("Hide replies") : label}
        </button>
      )}

      {open && (
        <>
          {canComment ? (
            <Composer target={target} onDone={() => {}} placeholder={collapsible ? tr("Write a reply…") : tr("Add a comment…")} submitLabel={collapsible ? tr("Reply") : tr("Post comment")} />
          ) : (
            <p className="text-xs text-foreground/80">{tr("Comments are closed.")}</p>
          )}

          {comments.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={tr("Sort comments")}>
              {(["newest", "top"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSort(s)} aria-pressed={sort === s} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${ring} ${sort === s ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30"}`}>
                  {s === "newest" ? tr("Newest") : tr("Top comments")}
                </button>
              ))}
            </div>
          )}

          {comments.length === 0 ? (
            <p className="text-sm text-foreground/80">{collapsible ? tr("No replies yet.") : tr("No comments yet. Start the conversation.")}</p>
          ) : (
            <ul className="flex flex-col gap-4">{tree.top.map(render)}</ul>
          )}
          <p aria-live="polite" className="min-h-4 text-xs font-medium text-sakura">
            {note && tr(note)}
          </p>
        </>
      )}
    </section>
  );
}
