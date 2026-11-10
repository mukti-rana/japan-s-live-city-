import { WifiOff } from "lucide-react";
import RetryButton from "@/components/community/RetryButton";
import Tx from "@/components/i18n/Tx";
import type { FeedProblem } from "@/lib/community/queries";

// The feed could not be read. The visitor gets a calm message and a Retry
// button; the real cause is in the server log. In development only, a short
// technical note says what to fix — it never appears on the live site.
export default function Unavailable({ reason }: { reason: FeedProblem }) {
  const note =
    reason === "not_configured"
      ? "Supabase is not configured here: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server."
      : reason === "not_set_up"
        ? "The community tables are missing: run supabase/migrations/0003 to 0008 (in order) in the Supabase SQL editor."
        : "The database request failed — see the server log (“[community] feed”) for the exact error.";
  return (
    <div role="status" className="rounded-3xl border border-glass-border bg-glass-bg px-5 py-10 text-center">
      <WifiOff size={30} aria-hidden="true" className="mx-auto text-foreground/70" />
      <h2 className="mt-3 text-lg font-semibold text-foreground">
        <Tx en="We couldn't load the community right now" />
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">
        <Tx en="This is a problem on our side, not yours. Please try again in a moment." />
      </p>
      <RetryButton />
      {process.env.NODE_ENV !== "production" && (
        <p className="mx-auto mt-5 max-w-lg rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-left text-xs text-gold">
          <span className="font-semibold"><Tx en="Dev note:" /></span> {note}
        </p>
      )}
    </div>
  );
}

