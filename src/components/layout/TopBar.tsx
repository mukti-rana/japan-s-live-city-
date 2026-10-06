import Logo from "@/components/ui/Logo";
import TopBarActions from "@/components/layout/TopBarActions";

// Deliberately has no server-side user lookup: reading cookies here would
// force every page in the app to render per request. Sign-in state is read
// in the browser instead (see AuthProvider), so public pages stay static.
export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-glass-border bg-sidebar-bg/95 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-2.5 lg:w-52">
        <Logo size={34} />
        <div className="hidden sm:block">
          <p className="text-sm font-bold leading-tight tracking-tight text-foreground">
            LIVE CITY
          </p>
          <p className="text-[9px] font-medium tracking-[0.18em] text-muted">
            JAPAN — REAL TIME
          </p>
        </div>
      </div>

      <TopBarActions />
    </header>
  );
}
