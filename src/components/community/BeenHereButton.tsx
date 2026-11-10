"use client";

import { useEffect, useState } from "react";
import { Check, MapPin } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { useTranslate } from "@/lib/i18n/inline";

// "Been here": you mark a place as visited yourself. It is never inferred from
// where you are, and your list is private unless you choose to share it.
export default function BeenHereButton({ placeRef }: { placeRef: string }) {
  const tr = useTranslate();
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const [been, setBeen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    createClient()
      .from("community_visited")
      .select("place_ref")
      .eq("user_id", user.id)
      .eq("place_ref", placeRef)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setBeen(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [user, placeRef]);

  async function toggle() {
    if (!user) return requestAccount();
    if (busy) return;
    setBusy(true);
    setError("");
    const next = !been;
    setBeen(next);
    try {
      const res = await fetch("/api/community/visited", { method: next ? "PUT" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeRef }) });
      if (!res.ok) {
        setBeen(!next);
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "That didn't work. Please try again.");
      }
    } catch {
      setBeen(!next);
      setError("That didn't work. Please try again.");
    }
    setBusy(false);
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={been}
        disabled={busy}
        className={`inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-70 ${been ? "border-mint/60 bg-mint/15 text-mint" : "border-glass-border bg-glass-bg text-foreground hover:border-white/30"}`}
      >
        {been ? <Check size={16} aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}
        {been ? tr("Been here ✓") : tr("Been here")}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs font-medium text-sakura">
          {tr(error)}
        </span>
      )}
    </span>
  );
}
