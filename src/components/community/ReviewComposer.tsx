"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { useTranslate } from "@/lib/i18n/inline";
import ReviewForm from "@/components/community/ReviewForm";

// "Write a review": opens the form right where you are. A guest gets the
// friendly sign-up card instead. If you already reviewed this place, the
// button gives way to a note (your review has Edit and Delete in the list).
export default function ReviewComposer({ placeRef, hasMine }: { placeRef: string; hasMine: boolean }) {
  const tr = useTranslate();
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const [open, setOpen] = useState(false);

  if (hasMine) {
    return <p className="text-sm text-foreground/85">{tr("You've reviewed this place. You can edit or delete your review below.")}</p>;
  }
  if (open) return <ReviewForm placeRef={placeRef} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />;
  return (
    <button type="button" onClick={() => (user ? setOpen(true) : requestAccount())} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
      <PenLine size={16} aria-hidden="true" />
      {tr("Write a review")}
    </button>
  );
}
