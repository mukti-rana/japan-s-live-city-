"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import AccountMenu from "@/components/layout/AccountMenu";
import HeaderSearch from "@/components/layout/HeaderSearch";
import NotificationsMenu from "@/components/layout/NotificationsMenu";
import EmergencyQuickPanel from "@/components/emergency/EmergencyQuickPanel";
import { E } from "@/lib/emergency/strings";
import { useInline } from "@/lib/i18n/inline";

// Search in the middle (it takes the spare room), then one even row of
// controls: SOS (a red icon), notifications, account. Language and the light / dark
// theme live in the sidebar.
export default function TopBarActions() {
  const e = useInline(E);
  const [sosOpen, setSosOpen] = useState(false);

  return (
    <>
      <HeaderSearch />

      <div className="ml-auto flex shrink-0 items-center gap-1 max-[359px]:gap-0.5 sm:gap-1.5">
        {/* One click from any page: the quick-access panel (110 / 119 / 118). */}
        <button
          type="button"
          onClick={() => setSosOpen(true)}
          aria-haspopup="dialog"
          aria-label={e("title")}
          title={e("title")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors duration-200 hover:bg-red-500/15 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:bg-red-500/25"
        >
          <ShieldAlert size={20} aria-hidden="true" />
          <span className="sr-only">{e("sos")}</span>
        </button>
        {sosOpen && <EmergencyQuickPanel onClose={() => setSosOpen(false)} />}

        <NotificationsMenu />
        <AccountMenu />
      </div>
    </>
  );
}
