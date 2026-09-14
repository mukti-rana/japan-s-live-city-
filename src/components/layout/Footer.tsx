import Logo from "@/components/ui/Logo";
import FooterClock from "@/components/layout/FooterClock";
import { mockCity } from "@/lib/mock/dashboard";

export default function Footer() {
  return (
    <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-glass-border bg-sidebar-bg px-4 py-3 text-[11px] text-muted sm:px-6">
      <div className="flex items-center gap-2">
        <Logo size={18} />
        <span className="font-semibold text-foreground/80">LIVE CITY</span>
        <span>Japan — Real Time Dashboard</span>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <span>Real-time data</span>
        <span className="text-glass-border">|</span>
        <span>Live updates</span>
        <span className="text-glass-border">|</span>
        <span>Your Japan, in one place</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-medium text-gold">
          Demo data
        </span>
        <FooterClock timeZone={mockCity.timeZone} />
      </div>
    </footer>
  );
}
