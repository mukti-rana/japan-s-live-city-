import type { Metadata } from "next";
import Link from "next/link";
import { UserCircle, LogOut, LogIn } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/supabase/actions";

export const metadata: Metadata = {
  title: "Settings — Live City Japan",
  description: "Manage your Live City Japan account.",
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

      {!isSupabaseConfigured && (
        <Reveal delay={0.08}>
          <SupabaseNotConfigured />
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

            <p className="mt-4 text-xs text-muted">
              Preferences like preferred language, favorite city, and saved
              tools are coming in a later update.
            </p>

            <form action={signOutAction} className="mt-4">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-sakura/30"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </form>
          </GlassCard>
        ) : (
          <GlassCard className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-azure/15 text-azure">
              <UserCircle size={24} />
            </div>
            <p className="text-sm text-muted">
              Log in to manage your account and preferences.
            </p>
            <Link
              href="/login"
              aria-disabled={!isSupabaseConfigured}
              className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background ${
                !isSupabaseConfigured ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <LogIn size={15} />
              Log In
            </Link>
          </GlassCard>
        )}
      </Reveal>
    </div>
  );
}
