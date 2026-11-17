"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Opens (and closes) the sidebar on desktop, where it is hidden until it is needed. The sidebar listens for
// "livecity:toggle-menu" and reports whether it is showing with "livecity:menu-state". Below 1024px the
// phone menu button and drawer do this job, so this button is not shown.
export default function MenuButton() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onState = (e: Event) => setOpen((e as CustomEvent).detail === true);
    window.addEventListener("livecity:menu-state", onState);
    return () => window.removeEventListener("livecity:menu-state", onState);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("livecity:toggle-menu"))}
      aria-label={t("nav.openMenu")}
      aria-expanded={open}
      aria-controls="site-sidebar"
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure lg:flex"
    >
      <Menu size={18} aria-hidden="true" />
    </button>
  );
}
