"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { markWelcomeSeen } from "@/lib/welcome";

// A link back to the site as a guest. Also records that the visitor has made
// their choice, so the first-visit welcome doesn't appear again.
export default function GuestLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link href="/" onClick={markWelcomeSeen} className={className}>
      {children}
    </Link>
  );
}
