import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

// The one button. Replaces ~39 hand-written h-11/h-12 rounded-xl variants.
//
// Renders a <button> by default, or a Next <Link> when `href` is given, so a
// navigation action and a form action look identical without duplicating the
// class list.

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0";

const VARIANT: Record<Variant, string> = {
  // Flat accent fill, not a gradient — gradients are reserved for meaning.
  primary: "bg-accent text-accent-ink hover:brightness-110 active:brightness-95",
  secondary:
    "border border-line bg-surface-2 text-text-primary hover:border-line-strong hover:bg-surface-3",
  ghost: "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
  danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-3 text-sm",
  md: "h-11 gap-2 px-5 text-sm", // 44px — meets the touch-target minimum
  lg: "h-12 gap-2 px-6 text-base",
};

const base =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] font-semibold transition-[background-color,border-color,filter,color] duration-[var(--dur-fast)] disabled:pointer-events-none disabled:opacity-45";

function classes(variant: Variant, size: Size, fullWidth: boolean, className: string) {
  return [base, VARIANT[variant], SIZE[size], fullWidth ? "w-full" : "", ring, className]
    .filter(Boolean)
    .join(" ");
}

type Common = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: Common & ComponentPropsWithoutRef<"button">) {
  return (
    <button className={classes(variant, size, fullWidth, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: Common & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link className={classes(variant, size, fullWidth, className)} {...rest}>
      {children}
    </Link>
  );
}
