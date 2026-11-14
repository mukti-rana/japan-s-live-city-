import type { ReactNode } from "react";

// Every Community page sits on the deep-black theme (see .cm-theme in globals.css).
// The negative margins cancel the app's own page padding so the black runs to the
// edges of the content area; the rest of the site is untouched.
export default function CommunityLayout({ children }: { children: ReactNode }) {
  return <div className="cm-theme -m-3 -mb-24 min-h-[calc(100dvh-4rem)] p-3 pb-24 sm:-m-4 sm:-mb-24 sm:p-4 sm:pb-24 lg:-mb-4 lg:pb-8">{children}</div>;
}
