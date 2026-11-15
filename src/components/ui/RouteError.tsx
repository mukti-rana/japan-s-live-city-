"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw, TriangleAlert } from "lucide-react";
import Tx from "@/components/i18n/Tx";

const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Shared fallback for every route-segment error.tsx. Next 16 passes `retry`
// (not `reset`, as in earlier versions) — calling it re-fetches and re-renders
// the segment, which is usually enough when a live feed timed out.
//
// Kept deliberately plain: this is a failure state, not a place for effects.
export default function RouteError({
  error,
  retry,
  title,
  hint,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  /** Short name of what failed, e.g. "the weather". */
  title?: string;
  /** One line on what the reader can do or expect. */
  hint?: string;
}) {
  useEffect(() => {
    // Server Component errors arrive with a generic message plus a digest that
    // matches the server log line; log both so the two can be tied together.
    console.error("[route error]", error.digest ?? "(no digest)", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl items-center justify-center py-10">
      <section
        role="alert"
        aria-labelledby="route-error-title"
        className="w-full rounded-2xl border border-glass-border bg-panel/70 p-6 text-center backdrop-blur-xl sm:p-8"
      >
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
          <TriangleAlert size={20} className="text-gold" aria-hidden="true" />
        </span>

        <h1 id="route-error-title" className="mt-4 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title ? <Tx en={`Could not load ${title}`} /> : <Tx en="Something went wrong" />}
        </h1>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-foreground/80">
          {hint ? <Tx en={hint} /> : <Tx en="This section failed to load. The rest of the site is still available." />}
        </p>

        <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => retry()}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-azure px-5 text-sm font-semibold text-background transition hover:brightness-110 ${ring}`}
          >
            <RefreshCw size={16} aria-hidden="true" />
            <Tx en="Try again" />
          </button>
          <Link
            href="/"
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-5 text-sm font-medium text-foreground transition-colors hover:border-white/30 ${ring}`}
          >
            <Home size={16} aria-hidden="true" />
            <Tx en="Back to home" />
          </Link>
        </div>

        {error.digest && (
          <p className="mt-5 text-xs text-muted">
            <Tx en="Reference" />: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </section>
    </div>
  );
}
