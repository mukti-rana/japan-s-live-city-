import type { Metadata } from "next";
import Link from "next/link";
import { UserCircle, Sparkles } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import SignOutButton from "@/components/auth/SignOutButton";
import SavedItems from "@/components/personalization/SavedItems";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings — Live City Japan",
  description: "Manage your Live City Japan account.",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = isSupabaseConfigured
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Account
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Manage your Live City Japan account.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <GlassCard className="p-5">
          <p className="text-sm font-semibold text-foreground">Language</p>
          <p className="mt-1 text-xs text-muted">
            Choose the language used across LIVE CITY.
            {user ? " It is saved to your account." : ""}
          </p>
          <div className="mt-3">
            <LanguageSwitcher variant="settings" />
          </div>
        </GlassCard>
      </Reveal>

      {!isSupabaseConfigured && (
        <Reveal delay={0.08}>
          <SupabaseNotConfigured />
        </Reveal>
      )}

      {isSupabaseConfigured && user && (
        <Reveal delay={0.1}>
          <GlassCard className="p-5">
            <p className="text-sm font-semibold text-foreground">Saved</p>
            <p className="mb-3 mt-1 text-xs text-muted">Your favorite cities, places and train lines.</p>
            <SavedItems />
          </GlassCard>
        </Reveal>
      )}

      <Reveal delay={0.12}>
        {isSupabaseConfigured && user ? (
          <GlassCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sakura/15 text-sakura">
                <UserCircle size={22} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.email}
                </p>
                <p className="text-xs text-muted">Signed in</p>
              </div>
            </div>

            <div className="mt-4">
              <SignOutButton />
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-azure via-neon-purple to-sakura text-white">
              <Sparkles size={22} />
            </div>
            <p className="text-sm font-semibold text-foreground">Want a more personalized LIVE CITY?</p>
            <p className="text-xs leading-relaxed text-muted">
              Create a free account to save your favorite cities, places and train lines, and keep your
              language everywhere you sign in.
            </p>
            <div className="flex w-full flex-col gap-2">
              <Link
                href="/signup"
                className="flex items-center justify-center rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground/90 hover:text-foreground"
              >
                Sign in
              </Link>
              <Link href="/" className="pt-1 text-xs text-muted hover:text-azure">
                Continue as guest
              </Link>
            </div>
          </GlassCard>
        )}
      </Reveal>
    </div>
  );
}
