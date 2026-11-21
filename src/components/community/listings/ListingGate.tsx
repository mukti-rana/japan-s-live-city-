import Link from "next/link";
import CommunityTabs, { type CommunitySection } from "@/components/community/CommunityTabs";
import Tx from "@/components/i18n/Tx";

// The page shown instead of the publishing form when there is no signed-in person (or the service is down).
export default function ListingGate({ section = "happening", heading, body, signIn }: { section?: CommunitySection; heading: string; body: string; signIn?: boolean; next?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6">
      <CommunityTabs active={section} />
      <div className="rounded-3xl border border-glass-border bg-glass-bg px-5 py-12 text-center backdrop-blur-xl">
        <h1 className="text-xl font-semibold text-foreground">
          <Tx en={heading} />
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">
          <Tx en={body} />
        </p>
        {signIn && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/login?form=1" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              <Tx en="Sign in" />
            </Link>
            <Link href="/signup?form=1" className="rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Tx en="Create account" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
