"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";

// Asks the server for this page again — used when the community could not be
// read. router.refresh() re-runs the page's queries without a full reload.
export default function RetryButton() {
  const tr = useTranslate();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      aria-busy={pending}
      className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-glass-border bg-glass-bg-strong px-5 text-sm font-semibold text-foreground transition hover:border-white/30 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
    >
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RotateCw size={16} aria-hidden="true" />}
      {tr("Try again")}
    </button>
  );
}
