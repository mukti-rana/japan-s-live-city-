// Derives real emergency alerts from the same live JMA earthquake feed
// (via P2P Quake) used by the Earthquakes page — specifically active
// tsunami advisories/warnings. No separate data source, no invented alerts.

import { getRecentEarthquakes } from "@/lib/services/earthquake";

const ACTIVE_TSUNAMI_CODES = ["Watch", "Warning", "MajorWarning"];

export type EmergencySeverity = "watch" | "warning" | "major-warning";

const SEVERITY_MAP: Record<string, EmergencySeverity> = {
  Watch: "watch",
  Warning: "warning",
  MajorWarning: "major-warning",
};

export interface EmergencyAlert {
  id: string;
  severity: EmergencySeverity;
  headline: string;
  location: string;
  time: string;
}

export async function getActiveEmergencyAlerts(): Promise<EmergencyAlert[]> {
  const quakes = await getRecentEarthquakes(30);

  return quakes
    .filter((quake) => ACTIVE_TSUNAMI_CODES.includes(quake.tsunamiCode))
    .map((quake) => ({
      id: quake.id,
      severity: SEVERITY_MAP[quake.tsunamiCode] ?? "watch",
      headline: quake.tsunami,
      location: quake.location,
      time: quake.time,
    }));
}
