"use client";

import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useTranslate } from "@/lib/i18n/inline";

// General text input with a always-visible label, optional helper text and an
// error state wired to aria-describedby / aria-invalid.
//
// The existing FieldInput (number inputs in the calculators) and AuthField
// (sign-in fields) stay as they are; this covers everything else, and those
// two can be rebuilt on top of it later without changing their call sites.
export default function Input({
  label,
  hint,
  error,
  leading,
  trailing,
  className = "",
  id,
  ...rest
}: {
  /** English label text; translated through the shared memory. */
  label: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
} & ComponentPropsWithoutRef<"input">) {
  const tr = useTranslate();
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
        {tr(label)}
      </label>

      <div
        className={`mt-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] border bg-surface-3 px-3 transition-colors duration-[var(--dur-fast)] focus-within:ring-2 focus-within:ring-accent ${
          error ? "border-danger" : "border-line focus-within:border-accent"
        }`}
      >
        {leading && <span className="shrink-0 text-text-tertiary">{leading}</span>}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-11 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          {...rest}
        />
        {trailing && <span className="shrink-0 text-text-tertiary">{trailing}</span>}
      </div>

      {/* Errors sit next to the field, never only in a summary at the top. */}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
          {tr(error)}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-text-tertiary">
          {tr(hint)}
        </p>
      )}
    </div>
  );
}
