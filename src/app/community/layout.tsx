import type { ReactNode } from "react";
import CommunityDock from "@/components/community/CommunityDock";

// Every Community page sits on the deep-black theme (see .cm-theme in globals.css), in the light theme too: the Community is a pitch-black
// social platform (data-community-page re-applies the dark palette over the light one, and keeps the top bar dark with it).
// The negative margins cancel the app's own page padding so the black runs to the edges of the content area; the rest of the site is untouched.
// The Create button floats at the foot of the screen (CommunityDock), and the page keeps room for it.
export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <div data-community-page className="cm-theme -m-3 -mb-24 min-h-[calc(100dvh-4rem)] p-3 pb-28 sm:-m-4 sm:-mb-24 sm:p-4 sm:pb-28 lg:-mb-4 lg:pb-28">
      {children}
      <CommunityDock />
    </div>
  );
}
