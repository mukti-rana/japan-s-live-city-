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

// The sign-in page: Explore as Guest on top, the sign-in form right below it.
// A failed attempt comes back here with ?error=… and the message shows above
// the form.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const error = first(sp.error);
  return (
    <AuthShell
      initialView="signin"
      signIn={<SignInForm configured={isSupabaseConfigured} error={error} />}
      signUp={<SignUpForm configured={isSupabaseConfigured} />}
    />
  );
}
