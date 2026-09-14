import type { Metadata } from "next";
import { ShieldCheck, TriangleAlert, Waves } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import { getActiveEmergencyAlerts, type EmergencyAlert } from "@/lib/services/emergency";

export const metadata: Metadata = {
  title: "Emergency — Live City Japan",
  description: "Active tsunami advisories and warnings for Japan, from the JMA.",
};

function formatTime(raw: string) {
  const iso = raw.replace(/\//g, "-").replace(" ", "T") + "+09:00";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function EmergencyPage() {
  const alerts = await getActiveEmergencyAlerts().catch<EmergencyAlert[] | null>(() => null);

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Live
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Emergency
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Active tsunami advisories and warnings, derived from the same
            live JMA earthquake feed as the Earthquakes page.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <GlassCard className="p-5">
          {!alerts ? (
            <p className="text-sm text-sakura">
              Live emergency data couldn&apos;t be loaded right now. Please
              try again shortly.
            </p>
          ) : alerts.length === 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint/15 text-mint">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No active alerts
                </p>
                <p className="text-xs text-muted">
                  No tsunami advisories or warnings are currently in effect.
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-center gap-4 border-b border-glass-border py-3.5 last:border-0"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      alert.severity === "major-warning"
                        ? "bg-sakura/15 text-sakura"
                        : alert.severity === "warning"
                          ? "bg-sakura/15 text-sakura"
                          : "bg-gold/15 text-gold"
                    }`}
                  >
                    {alert.severity === "watch" ? (
                      <TriangleAlert size={18} />
                    ) : (
                      <Waves size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {alert.headline}
                    </p>
                    <p className="font-jp mt-0.5 text-xs text-muted">
                      {alert.location}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {formatTime(alert.time)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-[11px] text-muted">
            Source: P2P Quake (relaying JMA data). Covers tsunami advisories
            only for now — other alert types may be added later.
          </p>
        </GlassCard>
      </Reveal>
    </div>
  );
}
