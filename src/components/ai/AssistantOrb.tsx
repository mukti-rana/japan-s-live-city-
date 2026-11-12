"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AIState } from "@/components/smoothui/ai-core";
import AIOrbFace from "@/components/smoothui/ai-orb-face";

// What the assistant is doing right now, shared between the chat (which knows)
// and the orb beside the page header (which shows it). The chat calls
// `set` for the long states (thinking, streaming) and `flash` for the brief ones
// (done, error): a flash shows its state and then goes back to idle by itself.
interface OrbControls {
  state: AIState;
  set: (state: AIState) => void;
  flash: (state: AIState, ms: number) => void;
}

const OrbContext = createContext<OrbControls | null>(null);

export function AssistantOrbProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AIState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const set = useCallback((next: AIState) => {
    clear();
    setState(next);
  }, []);
  const flash = useCallback((next: AIState, ms: number) => {
    clear();
    setState(next);
    timer.current = setTimeout(() => setState("idle"), ms);
  }, []);
  useEffect(() => clear, []);

  const value = useMemo(() => ({ state, set, flash }), [state, set, flash]);
  return <OrbContext.Provider value={value}>{children}</OrbContext.Provider>;
}

// The chat uses this to report what it is doing. Outside a provider it does
// nothing, so the chat still works on its own.
const NOOP: OrbControls = { state: "idle", set: () => {}, flash: () => {} };
export const useAssistantOrb = () => useContext(OrbContext) ?? NOOP;

// The orb itself: idle when nothing is happening, thinking after a message is
// sent, streaming while the reply arrives, done / error briefly at the end.
export default function AssistantOrb() {
  const { state } = useAssistantOrb();
  return <AIOrbFace aria-label={`Assistant is ${state}`} size={64} state={state} />;
}
