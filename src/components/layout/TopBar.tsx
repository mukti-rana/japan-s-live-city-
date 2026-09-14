import Link from "next/link";
import { Search, Bell, User } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function TopBar() {
  const user = isSupabaseConfigured
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-glass-border bg-sidebar-bg/95 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-2.5 lg:w-52">
        <Logo size={34} />
        <div className="hidden sm:block">
          <p className="text-sm font-bold leading-tight tracking-tight text-foreground">
            LIVE CITY
          </p>
          <p className="text-[9px] font-medium tracking-[0.18em] text-muted">
            JAPAN — REAL TIME
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="relative hidden sm:block">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            placeholder="Search city, station, news..."
            className="w-56 rounded-full border border-glass-border bg-glass-bg py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted focus:border-azure/40 focus:outline-none md:w-72"
          />
        </label>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-gold"
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sakura" />
        </button>

        <Link
          href="/settings"
          aria-label={user ? "Account" : "Log in"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground"
        >
          {user ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sakura to-gold text-xs font-bold text-background">
              {user.email?.[0]?.toUpperCase() ?? "?"}
            </span>
          ) : (
            <User size={17} />
          )}
        </Link>
      </div>
    </header>
  );
}
