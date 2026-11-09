"use client";

import Link from "next/link";
import { LogIn, MailCheck, TriangleAlert, UserPlus } from "lucide-react";
import AuthField from "@/components/ui/AuthField";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { signInAction, signUpAction } from "@/lib/supabase/actions";
import { friendlyAuthError } from "@/lib/supabase/authMessages";
import { known, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function Notice({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  const Icon = tone === "error" ? TriangleAlert : MailCheck;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-2xl border p-4 ${tone === "error" ? "border-sakura/30 bg-sakura/10" : "border-mint/30 bg-mint/10"}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${tone === "error" ? "text-sakura" : "text-mint"}`} aria-hidden="true" />
      <p className="text-xs leading-relaxed text-foreground/85">{children}</p>
    </div>
  );
}

// The sign-in form: same fields and server action as ever, now compact so it
// sits under the guest button. Supabase signs in with an email address, so
// that is what the field asks for.
export function SignInForm({ configured, error }: { configured: boolean; error?: string }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  return (
    <>
      {!configured && <SupabaseNotConfigured />}
      {error && <Notice tone="error">{known(friendlyAuthError(error), language)}</Notice>}
      <form action={signInAction} className="flex flex-col gap-3">
        <AuthField compact label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
        <AuthField compact label="Password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="rounded text-xs font-medium text-foreground underline-offset-2 transition-colors hover:text-lilac hover:underline focus-visible:text-lilac focus-visible:outline-none focus-visible:underline">
            {tr("Forgot password?")}
          </Link>
        </div>
        <AuthSubmitButton variant="quiet" disabled={!configured} pendingLabel={tr("Signing in…")}>
          <LogIn size={16} />
          {tr("Sign in")}
        </AuthSubmitButton>
      </form>
    </>
  );
}

// The existing create-account form (same fields, same server action).
export function SignUpForm({ configured, error, checkEmail }: { configured: boolean; error?: string; checkEmail?: boolean }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  return (
    <>
      {!configured && <SupabaseNotConfigured />}
      {checkEmail && <Notice tone="ok">{tr("Check your email for a confirmation link to finish creating your account.")}</Notice>}
      {error && <Notice tone="error">{known(friendlyAuthError(error), language)}</Notice>}
      <form action={signUpAction} className="flex flex-col gap-3">
        <AuthField compact label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
        <AuthField compact label="Password" name="password" type="password" placeholder="At least 6 characters" autoComplete="new-password" />
        <AuthSubmitButton disabled={!configured} pendingLabel={tr("Creating account…")}>
          <UserPlus size={16} />
          {tr("Create free account")}
        </AuthSubmitButton>
      </form>
    </>
  );
}
