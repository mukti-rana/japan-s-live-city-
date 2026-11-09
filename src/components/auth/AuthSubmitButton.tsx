"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

// The submit button on the sign-in / create-account forms. While the form's
// server action is running it disables itself (no double submits), shows a
// spinner and announces the busy state.
//   primary — the filled, main action (create account)
//   quiet   — an outlined button for when another action leads the panel
export default function AuthSubmitButton({
  disabled = false,
  pendingLabel,
  variant = "primary",
  children,
}: {
  disabled?: boolean;
  pendingLabel?: string;
  variant?: "primary" | "quiet";
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  const look =
    variant === "primary"
      ? "bg-gradient-to-r from-sakura to-lilac text-background shadow-[0_10px_30px_-12px_rgba(255,107,157,0.6)] hover:brightness-110"
      : "border border-lilac/50 bg-lilac/10 text-foreground hover:border-lilac hover:bg-lilac/20";
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none ${look}`}
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
