"use client";

import AccountMenu from "@/components/layout/AccountMenu";
import HeaderSearch from "@/components/layout/HeaderSearch";
import NotificationsMenu from "@/components/layout/NotificationsMenu";
import SosButton from "@/components/layout/SosButton";

// Search in the middle (it takes the spare room), then one even row of
// controls: SOS (a red icon), notifications, account. Language and the light / dark
// theme live in the sidebar.
export default function TopBarActions() {
  return (
    <>
      <HeaderSearch />

      <div className="ml-auto flex shrink-0 items-center gap-1 max-[359px]:gap-0.5 sm:gap-1.5">
        {/* The red SOS icon: point at it for the emergency numbers, click for the full dialog. */}
        <SosButton />
        <NotificationsMenu />
        <AccountMenu />
      </div>
    </>
  );
}
