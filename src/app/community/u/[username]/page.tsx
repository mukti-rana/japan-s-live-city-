import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProfileView from "@/components/community/ProfileView";
import { parseTab, tabsFor } from "@/lib/community/profileTabs";
import { fetchProfile } from "@/lib/community/profileQuery";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Tx from "@/components/i18n/Tx";

const USERNAME = /^[a-z0-9_]{3,24}$/;

export async function generateMetadata({ params }: PageProps<"/community/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const name = username.toLowerCase();
  // People's pages are for people to read, not for search engines to list.
  return { title: USERNAME.test(name) ? `@${name} — Community` : "Community", robots: { index: false, follow: false } };
}

// A public profile: what the person shares. (The viewer's own profile also shows
// their private tabs.)
export default async function ProfilePage({ params, searchParams }: PageProps<"/community/u/[username]">) {
  const { username } = await params;
  if (!USERNAME.test(username.toLowerCase())) notFound();
  if (!isSupabaseConfigured) {
    return (
      <div role="status" className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground"><Tx en="The community isn't available right now" /></h1>
        <p className="mt-2 text-sm text-foreground/85"><Tx en="Please try again in a little while." /></p>
      </div>
    );
  }
  const supabase = await createClient();
  const [profile, { data: auth }] = await Promise.all([fetchProfile(supabase, username), supabase.auth.getUser()]);
  if (!profile) notFound();
  const owner = auth.user?.id === profile.id;
  const tab = parseTab((await searchParams).tab, tabsFor(profile, owner));
  return <ProfileView client={supabase} profile={profile} owner={owner} tab={tab} basePath={`/community/u/${profile.username}`} />;
}
