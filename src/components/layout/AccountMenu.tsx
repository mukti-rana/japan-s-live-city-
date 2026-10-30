"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, LogIn, LogOut, Settings, SlidersHorizontal, User, UserPlus } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useInline, type Table } from "@/lib/i18n/inline";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/AuthContext";
import { ICON_BUTTON, MENU_PANEL, useDismiss } from "@/components/layout/usePopover";

const TEXT = {
  profile: { en: "Profile", ja: "プロフィール" },
  signedIn: { en: "Signed in", ja: "ログイン中" },
  settings: { en: "Account settings", ja: "アカウント設定" },
  saved: { en: "Saved places", ja: "保存した場所" },
  prefs: { en: "Preferences", ja: "設定" },
  signOut: { en: "Sign out", ja: "ログアウト" },
  guest: { en: "You're browsing as a guest", ja: "ゲストとして閲覧中" },
  guestNote: { en: "Sign in to save places and keep your language.", ja: "ログインすると、場所の保存や言語設定の保持ができます。" },
} satisfies Table;

const ITEM =
  "flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm text-foreground/90 transition-colors hover:bg-glass-bg-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

// One compact account control. Guests see Sign in / Create account; signed-in
// visitors see their account links. It uses the site's existing sign-in system
// — the same pages and the same sign-out call as the Settings page.
export default function AccountMenu() {
  const { t } = useLanguage();
  const text = useInline(TEXT);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  if (loading) return <span className="h-9 w-9 shrink-0" aria-hidden="true" />;

  const email = user?.email ?? null;

  async function signOut() {
    close();
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("topbar.account")}
        title={t("topbar.account")}
        className={ICON_BUTTON}
      >
        {email ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-azure to-neon-purple text-xs font-bold text-white">
            {email[0]?.toUpperCase() ?? "?"}
          </span>
        ) : (
          <User size={18} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div role="menu" className={`${MENU_PANEL} sm:w-64`}>
          {email ? (
            <>
              <Link href="/settings" role="menuitem" onClick={close} className={`${ITEM} h-auto min-h-12 py-2`}>
                <User size={16} className="shrink-0 text-azure" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-xs text-muted">{text("profile")}</span>
                  <span className="block truncate text-sm font-medium">{email}</span>
                </span>
              </Link>
              <div className="my-1 h-px bg-glass-border" role="separator" />
              <Link href="/settings" role="menuitem" onClick={close} className={ITEM}>
                <Settings size={16} className="shrink-0 text-muted" aria-hidden="true" />
                {text("settings")}
              </Link>
              <Link href="/settings#saved" role="menuitem" onClick={close} className={ITEM}>
                <Bookmark size={16} className="shrink-0 text-muted" aria-hidden="true" />
                {text("saved")}
              </Link>
              <Link href="/settings#preferences" role="menuitem" onClick={close} className={ITEM}>
                <SlidersHorizontal size={16} className="shrink-0 text-muted" aria-hidden="true" />
                {text("prefs")}
              </Link>
              <div className="my-1 h-px bg-glass-border" role="separator" />
              <button type="button" role="menuitem" onClick={signOut} className={ITEM}>
                <LogOut size={16} className="shrink-0 text-muted" aria-hidden="true" />
                {text("signOut")}
              </button>
            </>
          ) : (
            <>
              <div className="px-3 pb-2 pt-2">
                <p className="text-sm font-medium text-foreground">{text("guest")}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">{text("guestNote")}</p>
              </div>
              <Link href="/login" role="menuitem" onClick={close} className={ITEM}>
                <LogIn size={16} className="shrink-0 text-azure" aria-hidden="true" />
                {t("auth.signIn")}
              </Link>
              <Link href="/signup" role="menuitem" onClick={close} className={ITEM}>
                <UserPlus size={16} className="shrink-0 text-azure" aria-hidden="true" />
                {t("auth.createAccount")}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
