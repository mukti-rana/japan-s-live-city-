"use client";

import { useEffect } from "react";
import CinematicIntro from "@/components/intro/CinematicIntro";
import { beginIntro, finishIntro, holdPage, useIntroMode } from "@/lib/intro";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useWelcomeState } from "@/lib/welcome";

// Decides when the cinematic welcome plays: every time the home page is opened, before the main site shows (see
// lib/intro.ts). It does not touch sign-in: the existing entrance (WelcomeGate, the login and sign-up pages, the guest link
// and the server actions) works exactly as before. A visitor who has not yet chosen Login, Create Account or Guest sees that
// entrance first; the intro plays once they are past it:
//   - signed in (after Login, or after confirming a new account by email), or
//   - chose Explore as Guest (or pressed Escape on the welcome), or
//   - accounts aren't set up here, so there is no entrance to pass.
// Until then the page stays black behind the entrance, so the dashboard never shows before the intro.
export default function IntroGate() {
  const { user, loading, configured } = useAuth();
  const welcome = useWelcomeState();
  const mode = useIntroMode();

  const waiting = mode === "play";
  const passed = !configured || Boolean(user) || welcome === "seen";
  const play = waiting && !loading && passed;
  const hold = waiting && !play;

  // The home page waits, out of sight, until the intro hands over to it.
  useEffect(() => {
    if (!waiting) return;
    holdPage(true);
    return () => holdPage(false);
  }, [waiting]);

  useEffect(() => {
    if (play) beginIntro();
  }, [play]);

  return (
    <>
      {hold && <div aria-hidden="true" className="fixed inset-0 z-[60] bg-black" />}
      {play && <CinematicIntro onDone={finishIntro} />}
    </>
  );
}
