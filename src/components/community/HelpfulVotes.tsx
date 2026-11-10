"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ThumbsUp } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { useTranslate } from "@/lib/i18n/inline";

// Which of the visible reviews the signed-in person already marked helpful.
// One request for the whole list (not one per review); only your own votes are
// ever readable.
const Mine = createContext<Set<string>>(new Set());

export function HelpfulProvider({ reviewIds, children }: { reviewIds: string[]; children: ReactNode }) {
  const { user } = useAuth();
  const [mine, setMine] = useState<Set<string>>(new Set());
  const key = reviewIds.join(",");
  useEffect(() => {
    if (!user || !key) return;
    let active = true;
    createClient()
      .from("community_review_helpful")
      .select("review_id")
      .in("review_id", key.split(","))
      .then(({ data }) => {
        if (active && data) setMine(new Set(data.map((r) => r.review_id as string)));
      });
    return () => {
      active = false;
    };
  }, [user, key]);
  return <Mine.Provider value={mine}>{children}</Mine.Provider>;
}

const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60";

// "Helpful": a vote that this review was useful. It is separate from the star
// rating and from likes. You can't vote on your own review, or twice.
export function HelpfulButton({ reviewId, count, isMine }: { reviewId: string; count: number; isMine: boolean }) {
  const tr = useTranslate();
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const initial = useContext(Mine).has(reviewId);
  const [override, setOverride] = useState<boolean | null>(null);
  const on = override ?? initial;
  const [shown, setShown] = useState(count);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!user) return requestAccount();
    if (busy || isMine) return;
    setBusy(true);
    setError("");
    setOverride(!on);
    setShown((c) => Math.max(0, c + (on ? -1 : 1)));
    const db = createClient();
    const { error: dbError } = on ? await db.from("community_review_helpful").delete().eq("review_id", reviewId).eq("user_id", user.id) : await db.from("community_review_helpful").insert({ review_id: reviewId, user_id: user.id });
    if (dbError && dbError.code !== "23505") {
      setOverride(on);
      setShown((c) => Math.max(0, c + (on ? 1 : -1)));
      setError(dbError.code === "P0001" ? dbError.message : "That didn't work. Please try again.");
    }
    setBusy(false);
  }

  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={toggle} aria-pressed={on} disabled={busy || isMine} title={isMine ? tr("You can't vote on your own review.") : undefined} className={`${btn} ${on ? "border-mint/50 bg-mint/15 text-mint" : "border-glass-border bg-glass-bg text-foreground/90 hover:border-white/30"}`}>
        <ThumbsUp size={13} aria-hidden="true" fill={on ? "currentColor" : "none"} />
        {tr("Helpful")} <span className="tabular-nums">{shown}</span>
      </button>
      {error && (
        <span role="alert" className="mt-1 text-[11px] font-medium text-sakura">
          {tr(error)}
        </span>
      )}
    </span>
  );
}
