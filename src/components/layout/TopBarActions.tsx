"use client";

import Link from "next/link";
import { Search, Bell, User } from "lucide-react";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function TopBarActions({ userEmail }: { userEmail: string | null }) {
  const { t } = useLanguage();

  return (
    <div className="ml-auto flex items-center gap-2">
      <label className="relative hidden sm:block">
        <Search
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          placeholder={t("topbar.searchPlaceholder")}
          className="w-56 rounded-full border border-glass-border bg-glass-bg py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted focus:border-azure/40 focus:outline-none md:w-72"
        />
      </label>

      <LanguageSwitcher variant="topbar" />

      <button
        type="button"
        aria-label={t("topbar.notifications")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-gold"
      >
        <Bell size={17} />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sakura" />
      </button>

      <Link
        href="/settings"
        aria-label={userEmail ? t("topbar.account") : t("topbar.login")}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground"
      >
        {userEmail ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sakura to-gold text-xs font-bold text-background">
            {userEmail[0]?.toUpperCase() ?? "?"}
          </span>
        ) : (
          <User size={17} />
        )}
      </Link>
    </div>
  );
}
