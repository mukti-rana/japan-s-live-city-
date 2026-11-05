"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { markWelcomeSeen } from "@/lib/welcome";
import { useTranslate } from "@/lib/i18n/inline";

// A link back to the site as a guest. Also records that the visitor has made
// their choice, so the first-visit welcome doesn't appear again.
export default function GuestLink({
  className,
  label,
  children,
}: {
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const tr = useTranslate();
  return (
    <Link href="/" onClick={markWelcomeSeen} className={className} aria-label={label ? tr(label) : undefined} data-guest-link>
      {children}
    </Link>
  );
}
