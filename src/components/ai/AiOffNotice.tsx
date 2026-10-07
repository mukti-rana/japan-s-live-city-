import { TriangleAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// Shown on every AI screen while no ANTHROPIC_API_KEY is set (the AI is the
// only paid-capable part of the site, so it stays off until a key is added).
export default function AiOffNotice() {
  return (
    <GlassCard className="flex items-start gap-2.5 border-gold/25 bg-gold/5 p-4">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold" />
      <p className="text-xs leading-relaxed text-muted">
        <span className="font-semibold text-foreground">Coming soon.</span> LIVE CITY AI is turned off right now. The rest
        of the site — weather, trains, news, events and maps — works as normal.
      </p>
    </GlassCard>
  );
}
