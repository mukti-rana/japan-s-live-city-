import type { Metadata } from "next";
import Link from "next/link";
import CommunityTabs from "@/components/community/CommunityTabs";
import ProfileView from "@/components/community/ProfileView";
import { parseTab, tabsFor } from "@/lib/community/profileTabs";
import Tx from "@/components/i18n/Tx";
import { fetchProfileById } from "@/lib/community/profileQuery";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "My contributions — Community", robots: { index: false, follow: false } };

// This page is different for every person, so it is never cached or shared.
export const dynamic = "force-dynamic";

function Gate({ heading, body, signIn }: { heading: string; body: string; signIn?: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      <CommunityTabs active="me" />
      <div className="rounded-3xl border border-glass-border bg-glass-bg px-5 py-12 text-center backdrop-blur-xl">
        <h1 className="text-xl font-semibold text-foreground"><Tx en={heading} /></h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85"><Tx en={body} /></p>
        {signIn && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/login?form=1" className="rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><Tx en="Sign in" /></Link>
            <Link href="/signup?form=1" className="rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"><Tx en="Create account" /></Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Everything you have shared, saved and marked as visited, in one private place.
export default async function MyContributionsPage({ searchParams }: PageProps<"/community/me">) {
  if (!isSupabaseConfigured) return <Gate heading="The community isn't available right now" body="Please try again in a little while." />;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <Gate heading="Sign in to see your contributions" body="Your posts, reviews, questions, saved places and the places you've been to live here." signIn />;
  const profile = await fetchProfileById(supabase, auth.user.id);
  if (!profile) return <Gate heading="We couldn't find your profile" body="Please try again in a little while." />;
  const tab = parseTab((await searchParams).tab, tabsFor(profile, true));
  // Moderators get a link to the moderation page (everyone else never sees it).
  const { data: isMod } = await supabase.rpc("is_moderator");
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      <CommunityTabs active="me" />
      {isMod === true && (
        <Link href="/community/admin" className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-lilac/50 bg-lilac/10 px-4 text-sm font-semibold text-lilac transition-colors hover:bg-lilac/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Tx en="Open moderation" />
        </Link>
      )}
      <ProfileView client={supabase} profile={profile} owner tab={tab} basePath="/community/me" />
    </div>
  );
}
