import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/safeRedirect";

const FAILED = "Could not authenticate. Please try again.";
// Shown where accounts aren't set up (for example a preview copy of the site). Plain words only: nothing about the setup is revealed.
const UNAVAILABLE = "Sign-in isn't available here right now. Please try again later.";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only ever a path on this website (see safeNextPath): never an address on another site.
  const next = safeNextPath(searchParams.get("next"), origin);
  const toLogin = (message: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  if (code) {
    if (!isSupabaseConfigured) return toLogin(UNAVAILABLE);
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // Any failure while signing in (a network problem, a bad link) ends the same way as a refused code:
      // back to the sign-in page with a friendly message, never a server error and never any detail.
    }
  }

  return toLogin(FAILED);
}
