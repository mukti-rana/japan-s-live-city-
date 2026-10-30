"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Bell, MapPin, ShieldAlert } from "lucide-react";
import EmergencyQuickPanel from "@/components/emergency/EmergencyQuickPanel";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useSessionCity } from "@/lib/geo/sessionCity";
import { E } from "@/lib/emergency/strings";
import { useInline } from "@/lib/i18n/inline";

export default function TopBarActions() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const city = useSessionCity();
  const email = user?.email ?? null;
  const e = useInline(E);
  const [sosOpen, setSosOpen] = useState(false);

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

      {city && (
        <span
          className="hidden items-center gap-1 rounded-full border border-glass-border bg-glass-bg px-2.5 py-1.5 text-xs text-foreground/85 lg:flex"
          title={city}
        >
          <MapPin size={12} className="text-sakura" />
          <span className="max-w-[7rem] truncate">{city}</span>
        </span>
      )}

      {/* One click from any page: the quick-access panel (110 / 119 / 118). */}
      <button
        type="button"
        onClick={() => setSosOpen(true)}
        aria-haspopup="dialog"
        aria-label={e("title")}
        className="flex h-9 items-center gap-1.5 rounded-full border border-red-400/40 bg-red-600/90 px-3 text-xs font-bold tracking-wide text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:bg-red-700"
      >
        <ShieldAlert size={14} aria-hidden="true" />
        {e("sos")}
      </button>
      {sosOpen && <EmergencyQuickPanel onClose={() => setSosOpen(false)} />}

      <LanguageSwitcher variant="topbar" />

      <Link
        href="/emergency"
        aria-label={t("nav.alerts")}
        title={t("nav.alerts")}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-gold"
      >
        <Bell size={17} />
      </Link>

      {loading ? (
        <span className="h-9 w-9" aria-hidden="true" />
      ) : email ? (
        <Link
          href="/settings"
          aria-label={t("topbar.account")}
          className="flex h-9 w-9 items-center justify-center rounded-full"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sakura to-gold text-xs font-bold text-background">
            {email[0]?.toUpperCase() ?? "?"}
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            {t("auth.signIn")}
          </Link>
          <Link
            href="/signup"
            className="hidden rounded-full border border-glass-border bg-glass-bg px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-azure/40 sm:inline-flex"
          >
            {t("auth.createAccount")}
          </Link>
        </div>
      )}
    </div>
  );
}
