"use client";

import { useEffect, useRef, useState } from "react";
import { useAtmospherePrefs } from "@/lib/atmosphere/AtmosphereContext";
import { parsePrefs } from "@/lib/atmosphere/resolve";
import { useAuth } from "@/lib/supabase/AuthContext";
import { createClient } from "@/lib/supabase/client";

// For signed-in visitors: restores their saved atmosphere once per visit and
// keeps it saved when they change it. Guests are untouched (their choice
// lives in their own browser). If the account's table doesn't have the
// column yet (see supabase/migrations/0002_atmosphere.sql) this quietly does
// nothing and the local choice still works. Renders nothing.
export default function AtmosphereSync() {
  const { user, configured } = useAuth();
  const { prefs, setPrefs } = useAtmospherePrefs();
  const userId = user?.id ?? null;
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const synced = userId !== null && syncedFor === userId;
  const last = useRef("");

  useEffect(() => {
    if (!configured || !userId) return;
    let active = true;
    createClient()
      .from("user_preferences")
      .select("atmosphere")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        const saved = error ? null : (data as { atmosphere?: unknown } | null)?.atmosphere;
        if (saved) {
          const next = parsePrefs(saved);
          last.current = JSON.stringify(next);
          setPrefs(next);
        }
        setSyncedFor(userId);
      });
    return () => {
      active = false;
    };
    // Only on sign-in — later changes are saved below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, userId]);

  useEffect(() => {
    if (!configured || !userId || !synced) return;
    const json = JSON.stringify(prefs);
    if (json === last.current) return;
    last.current = json;
    createClient()
      .from("user_preferences")
      .upsert({ user_id: userId, atmosphere: prefs, updated_at: new Date().toISOString() })
      .then(() => {});
  }, [configured, userId, synced, prefs]);

  return null;
}
