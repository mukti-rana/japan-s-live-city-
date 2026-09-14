import type { Metadata } from "next";
import Link from "next/link";
import { Send, MailCheck } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import AuthField from "@/components/ui/AuthField";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requestPasswordResetAction } from "@/lib/supabase/actions";

export const metadata: Metadata = {
  title: "Forgot Password — Live City Japan",
  description: "Reset your Live City Japan account password.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<"/forgot-password">) {
  const { sent } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Account
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Forgot Password
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            We&apos;ll email you a link to reset it.
          </p>
        </div>
      </Reveal>

      {!isSupabaseConfigured && (
        <Reveal delay={0.06}>
          <SupabaseNotConfigured />
        </Reveal>
      )}

      {sent && (
        <Reveal delay={0.06}>
          <GlassCard className="flex items-start gap-2.5 border-mint/25 bg-mint/5 p-4">
            <MailCheck size={16} className="mt-0.5 shrink-0 text-mint" />
            <p className="text-xs leading-relaxed text-muted">
              If an account exists for that email, a reset link is on its
              way.
            </p>
          </GlassCard>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <GlassCard className="p-5">
          <form action={requestPasswordResetAction} className="flex flex-col gap-3.5">
            <AuthField
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />

            <button
              type="submit"
              disabled={!isSupabaseConfigured}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={15} />
              Send Reset Link
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            <Link href="/login" className="text-azure hover:underline">
              Back to log in
            </Link>
          </p>
        </GlassCard>
      </Reveal>
    </div>
  );
}
