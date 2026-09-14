import { TriangleAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export default function SupabaseNotConfigured() {
  return (
    <GlassCard className="flex items-start gap-2.5 border-gold/25 bg-gold/5 p-4">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold" />
      <p className="text-xs leading-relaxed text-muted">
        Accounts aren&apos;t configured yet. Add{" "}
        <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">
          NEXT_PUBLIC_SUPABASE_URL
        </code>{" "}
        and{" "}
        <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>{" "}
        to <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">.env.local</code>{" "}
        and restart the dev server to enable sign-in.
      </p>
    </GlassCard>
  );
}
