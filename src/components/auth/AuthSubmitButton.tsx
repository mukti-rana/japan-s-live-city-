import type { ReactNode } from "react";

// The primary action on the sign-in / create-account forms. Same height and
// width as the guest and secondary buttons in AuthShell so the three actions
// read as one consistent stack.
export default function AuthSubmitButton({
  disabled = false,
  children,
}: {
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sakura to-neon-purple text-sm font-semibold text-background shadow-[0_10px_30px_-12px_rgba(255,107,157,0.6)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
    >
      {children}
    </button>
  );
}
