import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, TriangleAlert } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import AuthField from "@/components/ui/AuthField";
import AuthShell from "@/components/auth/AuthShell";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signInAction } from "@/lib/supabase/actions";

export const metadata: Metadata = {
  title: "Sign in — Live City Japan",
  description: "Sign in to your Live City Japan account.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <AuthShell mode="login">
      {!isSupabaseConfigured && (
        <Reveal delay={0.08}>
          <SupabaseNotConfigured />
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

      <form action={signInAction} className="flex flex-col gap-3.5">
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
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-muted transition-colors hover:text-azure focus-visible:text-azure focus-visible:outline-none focus-visible:underline"
          >
            Forgot password?
          </Link>
        </div>

        <AuthSubmitButton disabled={!isSupabaseConfigured}>
          <LogIn size={16} />
          Sign in
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
