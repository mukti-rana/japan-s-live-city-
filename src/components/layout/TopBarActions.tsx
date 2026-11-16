"use client";

import { useState } from "react";
import { MapPin, ShieldAlert } from "lucide-react";
import AccountMenu from "@/components/layout/AccountMenu";
import HeaderSearch from "@/components/layout/HeaderSearch";
import NotificationsMenu from "@/components/layout/NotificationsMenu";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import ThemeToggle from "@/components/layout/ThemeToggle";
import EmergencyQuickPanel from "@/components/emergency/EmergencyQuickPanel";
import { useSessionCity } from "@/lib/geo/sessionCity";
import { E } from "@/lib/emergency/strings";
import { useInline } from "@/lib/i18n/inline";

// Search in the middle (it takes the spare room), then one even row of
// controls: SOS, language, theme, notifications, account.
export default function TopBarActions() {
  const city = useSessionCity();
  const e = useInline(E);
  const [sosOpen, setSosOpen] = useState(false);

  return (
    <>
      <HeaderSearch />

      <div className="ml-auto flex shrink-0 items-center gap-1 max-[359px]:gap-0.5 sm:gap-1.5">
        {city && (
          <span
            className="mr-1 hidden h-9 items-center gap-1 rounded-full border border-glass-border bg-glass-bg px-2.5 text-xs text-foreground/85 xl:flex"
            title={city}
          >
            <MapPin size={12} className="text-sakura" aria-hidden="true" />
            <span className="max-w-[7rem] truncate">{city}</span>
          </span>
        )}

        {/* One click from any page: the quick-access panel (110 / 119 / 118). */}
        <button
          type="button"
          onClick={() => setSosOpen(true)}
          aria-haspopup="dialog"
          aria-label={e("title")}
          className="mr-1 flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-red-400/30 bg-red-600/90 px-3 text-xs font-bold tracking-wide text-white transition-colors duration-200 max-[359px]:w-9 max-[359px]:justify-center max-[359px]:px-0 hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:bg-red-700 keep-dark-ink"
        >
          <ShieldAlert size={15} aria-hidden="true" />
          <span className="max-[359px]:sr-only">{e("sos")}</span>
        </button>
        {sosOpen && <EmergencyQuickPanel onClose={() => setSosOpen(false)} />}

        <LanguageSwitcher variant="topbar" />
        <ThemeToggle />
        <NotificationsMenu />
        <AccountMenu />
      </div>
    </>
  );
}
