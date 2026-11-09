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

// Opens on the create-account form, with a way back to sign in and a guest
// link. A failed attempt (?error=…) and the "check your email" confirmation
// come back here and show above the form.
export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const error = first(sp.error);
  const checkEmail = Boolean(first(sp.check_email));
  return (
    <AuthShell
      initialView="signup"
      signIn={<SignInForm configured={isSupabaseConfigured} />}
      signUp={<SignUpForm configured={isSupabaseConfigured} error={error} checkEmail={checkEmail} />}
    />
  );
}
