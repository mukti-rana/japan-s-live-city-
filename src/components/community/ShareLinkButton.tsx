"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";

// Share a public page: the phone's share sheet where there is one, otherwise
// the link is copied. The address shared is always the plain public one.
export default function ShareLinkButton({ title, path }: { title: string; path: string }) {
  const tr = useTranslate();
  const [note, setNote] = useState("");
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
      if (e instanceof DOMException && e.name === "AbortError") return;
      setNote("Couldn't copy the link. You can copy it from the address bar.");
    }
  }
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={share} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-glass-border bg-glass-bg px-3 text-xs font-medium text-foreground transition-colors hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
        <Share2 size={13} aria-hidden="true" />
        {tr("Share")}
      </button>
      <span aria-live="polite" className="mt-1 min-h-4 text-[11px] text-foreground/80">
        {note && tr(note)}
      </span>
    </span>
  );
}
