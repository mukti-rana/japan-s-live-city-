"use client";

import { useEffect } from "react";
import CinematicIntro from "@/components/intro/CinematicIntro";
import { beginIntro, finishIntro, useIntroMode } from "@/lib/intro";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useWelcomeState } from "@/lib/welcome";

// Decides when the cinematic welcome plays. It does not touch sign-in: the existing entrance (WelcomeGate, the login
// and sign-up pages, the guest link and the server actions) works exactly as before. The intro simply plays on the home
// page once the visitor has got past that entrance:
//   - signed in (after Login, or after confirming a new account by email), or
//   - chose Explore as Guest (or pressed Escape on the welcome), or
//   - accounts aren't set up here, so there is no entrance to pass.
// Until then the page stays black behind the entrance, so the dashboard never shows before the intro.
export default function IntroGate() {
  const { user, loading, configured } = useAuth();
  const welcome = useWelcomeState();
  const mode = useIntroMode();

  const waiting = mode === "full" || mode === "short";
  const passed = !configured || Boolean(user) || welcome === "seen";
  const play = waiting && !loading && passed;
  const hold = waiting && !play;

  useEffect(() => {
    if (play && (mode === "full" || mode === "short")) beginIntro(mode);
  }, [play, mode]);

  return (
    <>
      {hold && <div aria-hidden="true" className="fixed inset-0 z-[60] bg-black" />}
      {play && (mode === "full" || mode === "short") && <CinematicIntro mode={mode} onDone={finishIntro} />}
    </>
  );
}
