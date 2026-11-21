import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingGate from "@/components/community/listings/ListingGate";
import ListingWizard from "@/components/community/listings/ListingWizard";
import { inputFromListing } from "@/lib/community/listings/form";
import ListingsHeader from "@/components/community/listings/ListingsHeader";
import { fetchListing } from "@/lib/community/listings/queries";
import { isUuid } from "@/lib/community/listings/server";
import { fetchProfileById } from "@/lib/community/profileQuery";
import { photoUrl } from "@/lib/community/photos";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Edit — Community — Live City Japan", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Only the author edits (the database enforces it as well; this just keeps everyone else from seeing a form that would fail).
export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  if (!isSupabaseConfigured) return <ListingGate heading="Editing isn't available right now" body="Please try again in a little while." />;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <ListingGate heading="Sign in to edit" body="Sign in with the account that published this." signIn />;
  const res = await fetchListing(supabase, id);
  if (res.state === "unavailable") return <ListingGate heading="This isn't available right now" body="Please try again in a little while." />;
  if (res.state === "missing" || res.listing.userId !== auth.user.id) notFound();
  const l = res.listing;
  const profile = await fetchProfileById(supabase, auth.user.id);
  const photos = l.media.flatMap((m) => {
    const url = m.kind === "image" && m.path ? photoUrl(m.path) : null;
    return m.path && url ? [{ path: m.path, url }] : [];
  });
  if (l.status === "hidden" || l.status === "rejected") {
    return <ListingGate heading="This can't be edited" body="A moderator has taken this down. If you think that was a mistake, please use the report option on its page." />;
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-10">
      <ListingsHeader section="happening" title="Edit" intro={l.title} />
      <ListingWizard kind={l.kind} author={{ username: profile?.displayName ?? profile?.username ?? "", avatarUrl: profile?.avatarUrl ?? null }} initial={{ id: l.id, status: l.status, input: inputFromListing(l), photos }} />
    </div>
  );
}
