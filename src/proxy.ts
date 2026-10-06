import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Revalidates the session and writes a refreshed token back via setAll
  // above when needed — must run before any response is returned.
  await supabase.auth.getUser();

  return response;
}

// Only the account-related routes need the session refreshed on the
// server. Public pages are deliberately skipped: they don't read the user
// on the server, so running (and calling Supabase) on every public request
// would only add latency and cost.
export const config = {
  matcher: ["/settings", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/:path*"],
};
