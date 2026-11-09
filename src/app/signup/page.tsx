import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { SignInForm, SignUpForm } from "@/components/auth/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Create account — Live City Japan",
  description: "Create your free Live City Japan account.",
  robots: { index: false, follow: false },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Opens guest-first; goes straight to the create-account form for ?form=1, a
// failed attempt (?error=…) or the "check your email" confirmation.
export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const error = first(sp.error);
  const checkEmail = Boolean(first(sp.check_email));
  const direct = Boolean(error || checkEmail || first(sp.form));
  return (
    <AuthShell
      initialView={direct ? "signup" : "welcome"}
      signIn={<SignInForm configured={isSupabaseConfigured} />}
      signUp={<SignUpForm configured={isSupabaseConfigured} error={error} checkEmail={checkEmail} />}
    />
  );
}
