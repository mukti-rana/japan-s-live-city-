import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Home, MapPin, Users } from "lucide-react";
import Tx from "@/components/i18n/Tx";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// The "page not found" page, in the site's own dark glass style, with a clear way
// back. (Without this file the browser's plain white default is shown.)
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center py-10">
      <section aria-labelledby="nf-title" className="relative w-full overflow-hidden rounded-3xl border border-glass-border bg-panel/70 p-6 text-center shadow-[0_20px_60px_-30px_rgba(168,85,247,0.55),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-gradient-to-r from-azure/30 via-neon-purple/30 to-sakura/30 blur-3xl" />
        <p aria-hidden="true" className="relative bg-gradient-to-r from-azure via-lilac to-sakura bg-clip-text text-7xl font-bold tracking-tight text-transparent sm:text-8xl">
          404
        </p>
        <h1 id="nf-title" className="relative mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          <Tx en="This page could not be found" />
        </h1>
        <p className="relative mx-auto mt-3 max-w-sm text-sm leading-relaxed text-foreground/85">
          <Tx en="The address may be mistyped, or the page may have moved or been removed." />
        </p>
        <div className="relative mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-6 text-sm font-semibold text-white transition hover:brightness-110 ${ring}`}>
            <Home size={16} aria-hidden="true" />
            <Tx en="Back to home" />
          </Link>
          <Link href="/community" className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-6 text-sm font-medium text-foreground transition-colors hover:border-white/30 ${ring}`}>
            <Users size={16} aria-hidden="true" />
            <Tx en="Community" />
          </Link>
        </div>
        <nav aria-labelledby="nf-popular" className="relative mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-foreground/80">
          <span id="nf-popular" className="sr-only">
            <Tx en="Popular pages" />
          </span>
          <Link href="/explore" className={`inline-flex items-center gap-1.5 rounded underline-offset-2 hover:text-azure hover:underline ${ring}`}>
            <Compass size={13} aria-hidden="true" />
            <Tx en="Explore" />
          </Link>
          <Link href="/map" className={`inline-flex items-center gap-1.5 rounded underline-offset-2 hover:text-azure hover:underline ${ring}`}>
            <MapPin size={13} aria-hidden="true" />
            <Tx en="Japan Map" />
          </Link>
        </nav>
      </section>
    </div>
  );
}
