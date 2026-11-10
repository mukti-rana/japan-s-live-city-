import type { CommunityProfile } from "@/lib/community/types";

// The tabs of a profile and who may see which. Saved items and the editor are
// private to the owner; "places visited" is shown to others only if the owner
// chose to share it. A visitor who asks for a tab they may not see just gets
// the first tab.

export type ProfileTab = "posts" | "photos" | "reviews" | "questions" | "answers" | "visited" | "saved" | "profile";
export const ALL_TABS: ProfileTab[] = ["posts", "photos", "reviews", "questions", "answers", "visited", "saved", "profile"];

export function tabsFor(profile: Pick<CommunityProfile, "showVisited">, owner: boolean): ProfileTab[] {
  return ALL_TABS.filter((t) => (t === "saved" || t === "profile" ? owner : t === "visited" ? owner || profile.showVisited : true));
}

export function parseTab(raw: string | string[] | undefined, allowed: ProfileTab[]): ProfileTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return allowed.includes(v as ProfileTab) ? (v as ProfileTab) : "posts";
}
