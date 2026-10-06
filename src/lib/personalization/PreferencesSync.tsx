"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { isLanguageCode } from "@/lib/i18n/languages";
import { createClient } from "@/lib/supabase/client";

// For signed-in users only: restores their saved language once per visit,
// then keeps it saved whenever they change it. Guests are untouched — their
// language choice stays in their own browser as before. Renders nothing.
export default function PreferencesSync() {
  const { user, configured } = useAuth();
  const { language, setLanguage, ready } = useLanguage();
  // Which user has had their saved language restored. Keyed by user so a
  // sign-out/sign-in as someone else naturally starts fresh.
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const userId = user?.id ?? null;
  const synced = userId !== null && syncedFor === userId;

  useEffect(() => {
    if (!configured || !userId || !ready) return;
    let active = true;
    createClient()
      .from("user_preferences")
      .select("language")
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const saved = (data as { language?: unknown } | null)?.language;
        if (isLanguageCode(saved) && saved !== language) setLanguage(saved);
        setSyncedFor(userId);
      });
    return () => {
      active = false;
    };
    // Only on sign-in/ready — later language changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, userId, ready]);

  useEffect(() => {
    if (!configured || !userId || !synced) return;
    createClient()
      .from("user_preferences")
      .upsert({ user_id: userId, language, updated_at: new Date().toISOString() });
  }, [configured, userId, synced, language]);

  return null;
}
