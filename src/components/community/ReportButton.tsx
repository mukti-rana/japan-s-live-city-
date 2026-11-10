"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useAccountPrompt } from "@/components/auth/AccountPromptProvider";
import { useTranslate } from "@/lib/i18n/inline";
import ReportDialog, { type ReportTarget } from "@/components/community/ReportDialog";

// A small "Report" link for a review. Guests get the friendly sign-up card.
export default function ReportButton({ targetType, targetId }: { targetType: ReportTarget; targetId: string }) {
  const tr = useTranslate();
  const { user } = useAuth();
  const { requestAccount } = useAccountPrompt();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => (user ? setOpen(true) : requestAccount())} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
        <Flag size={13} aria-hidden="true" />
        {tr("Report")}
      </button>
      {open && <ReportDialog targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  );
}
