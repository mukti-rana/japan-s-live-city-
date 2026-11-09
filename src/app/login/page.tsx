import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { SignInForm, SignUpForm } from "@/components/auth/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in — Live City Japan",
  description: "Sign in to your Live City Japan account.",
  robots: { index: false, follow: false },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Opens guest-first (the welcome screen). It opens straight on the sign-in
// form when the visitor came to sign in on purpose (?form=1) or is returning
// from a failed attempt (?error=…), so the message is never hidden.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const error = first(sp.error);
  const direct = Boolean(error || first(sp.form));
  return (
    <AuthShell
      initialView={direct ? "signin" : "welcome"}
      signIn={<SignInForm configured={isSupabaseConfigured} error={error} />}
      signUp={<SignUpForm configured={isSupabaseConfigured} />}
    />
  );
}
