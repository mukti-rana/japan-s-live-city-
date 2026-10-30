import Link from "next/link";
import Logo from "@/components/ui/Logo";
import TopBarActions from "@/components/layout/TopBarActions";

// Deliberately has no server-side user lookup: reading cookies here would
// force every page in the app to render per request. Sign-in state is read
// in the browser instead (see AuthProvider), so public pages stay static.
export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-glass-border bg-sidebar-bg/95 px-3 backdrop-blur-xl sm:gap-4 sm:px-5">
      <Link href="/" aria-label="LIVE CITY JAPAN" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
        <Logo size={32} />
        <div className="hidden whitespace-nowrap sm:block">
          <p className="text-sm font-bold leading-none tracking-tight text-foreground">LIVE CITY</p>
          <p className="mt-1 text-[9px] font-medium leading-none tracking-[0.18em] text-muted">JAPAN — REAL TIME</p>
        </div>
      </Link>

      <TopBarActions />
    </header>
  );
}
