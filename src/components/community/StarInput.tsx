"use client";

import { Star } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";

// Pick a rating from 1 to 5 stars. It is a real radio group, so it works with
// the arrow keys and screen readers, and each star is a large touch target.
export default function StarInput({ value, onChange, invalid, describedBy }: { value: number; onChange: (n: number) => void; invalid?: boolean; describedBy?: string }) {
  const tr = useTranslate();
  const words = ["Terrible", "Poor", "Okay", "Good", "Excellent"];
  return (
    <div>
      <div role="radiogroup" aria-label={tr("Your rating")} aria-invalid={invalid || undefined} aria-describedby={describedBy} data-invalid={invalid ? "true" : undefined} tabIndex={-1} className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded-lg p-1.5 focus-within:ring-2 focus-within:ring-azure">
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-label={`${n} / 5 — ${tr(words[n - 1])}`} />
            <Star size={30} aria-hidden="true" className={n <= value ? "text-gold" : "text-white/30 hover:text-gold/60"} fill={n <= value ? "currentColor" : "none"} />
          </label>
        ))}
      </div>
      <p className="mt-1 min-h-4 text-xs text-foreground/80" aria-live="polite">
        {value > 0 ? tr(words[value - 1]) : ""}
      </p>
    </div>
  );
}
