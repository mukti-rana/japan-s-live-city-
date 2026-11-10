import { Star } from "lucide-react";

// A read-only star rating. Partial averages fill the stars proportionally
// (4.5 shows four and a half), and screen readers get the number in words.
export default function Stars({ value, size = 16, label }: { value: number; size?: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} aria-hidden="true" className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-white/25" />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-gold" fill="currentColor" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
