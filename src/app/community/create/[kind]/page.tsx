import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingGate from "@/components/community/listings/ListingGate";
import ListingWizard from "@/components/community/listings/ListingWizard";
import ListingsHeader from "@/components/community/listings/ListingsHeader";
import { fetchProfileById } from "@/lib/community/profileQuery";
import type { ListingKind } from "@/lib/community/listings/types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Publish — Community — Live City Japan", robots: { index: false, follow: false } };
// Different for every person.
export const dynamic = "force-dynamic";

const KINDS: Record<string, { kind: ListingKind; title: string; intro: string }> = {
  event: { kind: "event", title: "Publish an event", intro: "Tell people what is happening, when and where." },
  announcement: { kind: "announcement", title: "Publish an announcement", intro: "Share news the community should know." },
  promotion: { kind: "promotion", title: "Publish a business offer", intro: "Tell people about a deal or something new." },
  activity: { kind: "activity", title: "Publish a community activity", intro: "Invite people to take part." },
};

export default async function CreateListingPage({ params }: { params: Promise<{ kind: string }> }) {
  const k = KINDS[(await params).kind];
  if (!k) notFound();
  if (!isSupabaseConfigured) return <ListingGate heading="Publishing isn't available right now" body="Please try again in a little while." />;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <ListingGate heading="Sign in to publish" body="You need an account to publish. Browsing is open to everyone." signIn />;
  const profile = await fetchProfileById(supabase, auth.user.id);
  if (!profile) return <ListingGate heading="We couldn't find your profile" body="Please try again in a little while." />;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-10">
      <ListingsHeader section="happening" title={k.title} intro={k.intro} />
      <ListingWizard kind={k.kind} author={{ username: profile.displayName ?? profile.username, avatarUrl: profile.avatarUrl }} />
    </div>
  );
}
