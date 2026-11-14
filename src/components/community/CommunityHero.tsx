import type { ReactNode } from "react";

// The title block at the top of a Community section page: just text — a small
// label, the heading, one line of explanation — with no banner or box around it.
export default function CommunityHero({ children }: { children: ReactNode }) {
  return <header className="flex flex-col items-start py-1 [&>h1]:text-2xl [&>h1]:font-semibold [&>h1]:tracking-tight sm:[&>h1]:text-3xl [&>p:last-child]:mt-3">{children}</header>;
}
