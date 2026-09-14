import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, TriangleAlert } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import AuthField from "@/components/ui/AuthField";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signInAction } from "@/lib/supabase/actions";

export const metadata: Metadata = {
  title: "Log In — Live City Japan",
  description: "Log in to your Live City Japan account.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Account
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Log In
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Welcome back to Live City Japan.
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
                className="text-xs text-muted transition-colors hover:text-azure"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={!isSupabaseConfigured}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LogIn size={15} />
              Log In
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-azure hover:underline">
              Sign up
            </Link>
          </p>
        </GlassCard>
      </Reveal>
    </div>
  );
}
