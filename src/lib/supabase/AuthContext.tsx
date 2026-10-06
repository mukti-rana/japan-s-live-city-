"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface AuthValue {
  user: User | null;
  // True only until the first session check finishes — lets the UI avoid
  // flashing "Sign in" at someone who is actually signed in.
  loading: boolean;
  configured: boolean;
}

const AuthContext = createContext<AuthValue>({ user: null, loading: false, configured: false });

// Reads the sign-in state in the browser instead of on the server. That is
// deliberate: asking the server (cookies) in the shared layout would make
// every page render per-request, which slows public pages down, costs more
// function runs, and hurts what search engines can cache. With this, every
// public page stays static for everyone and personalization layers on top.
// getSession() only reads the local cookie (no network call), which is fine
// for deciding what to *show*; anything private is still enforced by
// Supabase row-level security, not by this value.
export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // Re-check on every navigation: signing in/out happens through server
  // actions that change cookies behind this component's back.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, configured: isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
