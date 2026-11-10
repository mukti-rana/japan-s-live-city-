"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";

// Take a place off your "been here" list.
export default function RemoveVisitedButton({ placeRef }: { placeRef: string }) {
  const tr = useTranslate();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={tr("Remove from places I've been")}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/community/visited", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeRef }) });
        if (res.ok) router.refresh();
        setBusy(false);
      }}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
    >
      <X size={14} aria-hidden="true" />
    </button>
  );
}
