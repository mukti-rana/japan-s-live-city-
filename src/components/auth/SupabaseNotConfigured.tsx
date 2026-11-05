import { TriangleAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Tx from "@/components/i18n/Tx";

export default function SupabaseNotConfigured() {
  return (
    <GlassCard className="flex items-start gap-2.5 border-gold/25 bg-gold/5 p-4">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold" />
      <div className="text-xs leading-relaxed text-muted">
        <p>
          <Tx en="Accounts aren't configured yet. Add the two variables below to .env.local and restart the dev server to enable sign-in." />
        </p>
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">NEXT_PUBLIC_SUPABASE_URL</code>
          <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
        </p>
      </div>
    </GlassCard>
  );
}
