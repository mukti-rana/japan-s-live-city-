import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, TriangleAlert, MailCheck } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import AuthField from "@/components/ui/AuthField";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signUpAction } from "@/lib/supabase/actions";

export const metadata: Metadata = {
  title: "Sign Up — Live City Japan",
  description: "Create your Live City Japan account.",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { error, check_email } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Account
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Sign Up
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Create your Live City Japan account.
          </p>
        </div>
      </Reveal>

      {!isSupabaseConfigured && (
        <Reveal delay={0.06}>
          <SupabaseNotConfigured />
        </Reveal>
      )}

      {check_email && (
        <Reveal delay={0.06}>
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
              Create Account
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-azure hover:underline">
              Log in
            </Link>
          </p>
        </GlassCard>
      </Reveal>
    </div>
  );
}
