import type { Metadata } from "next";
import { KeyRound, TriangleAlert } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import AuthField from "@/components/ui/AuthField";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { updatePasswordAction } from "@/lib/supabase/actions";

export const metadata: Metadata = {
  title: "Reset Password — Live City Japan",
  description: "Set a new password for your Live City Japan account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Account
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Reset Password
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Choose a new password for your account.
          </p>
        </div>
      </Reveal>

      {!isSupabaseConfigured && (
        <Reveal delay={0.06}>
          <SupabaseNotConfigured />
        </Reveal>
      )}

      {error && (
        <Reveal delay={0.06}>
          <GlassCard className="flex items-start gap-2.5 border-sakura/25 bg-sakura/5 p-4">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-sakura" />
            <p className="text-xs leading-relaxed text-muted">
              {Array.isArray(error) ? error[0] : error}
            </p>
          </GlassCard>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <GlassCard className="p-5">
          <form action={updatePasswordAction} className="flex flex-col gap-3.5">
            <AuthField
              label="New password"
              name="password"
              type="password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={!isSupabaseConfigured}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <KeyRound size={15} />
              Update Password
            </button>
          </form>
        </GlassCard>
      </Reveal>
    </div>
  );
}
