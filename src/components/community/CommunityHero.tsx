import type { ReactNode } from "react";

// The header card on every Community page: flat black, one subtle border, no
// decoration — the content below is the star, not the banner.
export default function CommunityHero({ children }: { children: ReactNode }) {
  return <header className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5 sm:p-6">{children}</header>;
}
