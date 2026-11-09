"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";

// Uncontrolled input for use with Server Action forms (FormData-based),
// unlike FieldInput which is a controlled component for client-side state.
// Password fields get a show/hide button; the value is still submitted as the
// field named `name` either way.
export default function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
  autoComplete,
  compact = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  compact?: boolean;
}) {
  const tr = useTranslate();
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const Icon = shown ? EyeOff : Eye;
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground">{tr(label)}</span>
      <span className="relative mt-1.5 block">
        <input
          name={name}
          type={isPassword && shown ? "text" : type}
          placeholder={placeholder ? tr(placeholder) : undefined}
          required={required}
          autoComplete={autoComplete}
          spellCheck={isPassword || type === "email" ? false : undefined}
          autoCapitalize={isPassword || type === "email" ? "none" : undefined}
          className={`w-full rounded-xl border border-glass-border bg-black/30 px-4 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus:bg-glass-bg-strong focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm ${compact ? "h-11" : "h-12"} ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={tr(shown ? "Hide password" : "Show password")}
            aria-pressed={shown}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        )}
      </span>
    </label>
  );
}
