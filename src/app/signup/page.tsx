import type { Metadata } from "next";
import { UserPlus, TriangleAlert, MailCheck } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import AuthField from "@/components/ui/AuthField";
import AuthShell from "@/components/auth/AuthShell";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signUpAction } from "@/lib/supabase/actions";

export const metadata: Metadata = {
  title: "Create account — Live City Japan",
  description: "Create your free Live City Japan account.",
  robots: { index: false, follow: false },
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { error, check_email } = await searchParams;

  return (
    <AuthShell mode="signup">
      {!isSupabaseConfigured && (
        <Reveal delay={0.08}>
          <SupabaseNotConfigured />
        </Reveal>
      )}

      {check_email && (
        <Reveal delay={0.08}>
          <GlassCard className="flex items-start gap-2.5 border-mint/25 bg-mint/5 p-4">
            <MailCheck size={16} className="mt-0.5 shrink-0 text-mint" />
            <p className="text-xs leading-relaxed text-muted">
              Check your email for a confirmation link to finish creating
              your account.
            </p>
          </GlassCard>
        </Reveal>
      )}

      {error && (
        <Reveal delay={0.08}>
          <GlassCard className="flex items-start gap-2.5 border-sakura/25 bg-sakura/5 p-4">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-sakura" />
            <p className="text-xs leading-relaxed text-muted">
              {Array.isArray(error) ? error[0] : error}
            </p>
          </GlassCard>
        </Reveal>
      )}

      <Reveal delay={0.12}>
        <GlassCard className="p-5">
          <form action={signUpAction} className="flex flex-col gap-3.5">
            <AuthField
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            <AuthField
              label="Password"
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
              <UserPlus size={15} />
              Create free account
            </button>
          </form>
        </GlassCard>
      </Reveal>
    </AuthShell>
  );
}
