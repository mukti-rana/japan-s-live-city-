import type { Metadata } from "next";
import EmergencyNumbers from "@/components/emergency/EmergencyNumbers";
import EmergencyGuidance from "@/components/emergency/EmergencyGuidance";
import PhrasesCard from "@/components/emergency/PhrasesCard";
import NearbyHelp from "@/components/emergency/NearbyHelp";
import OfficialAlerts from "@/components/emergency/OfficialAlerts";
import ReadinessCard from "@/components/emergency/ReadinessCard";
import EmergencyHeader from "@/components/emergency/EmergencyHeader";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

export const metadata: Metadata = {
  title: "Emergency Center — Live City Japan",
  description:
    "Emergency numbers for Japan (110, 119, 118), what to do in an emergency, Japanese phrases to show, nearby evacuation sites, and official JMA alerts. No login required.",
};

// The numbers and guidance are bundled with the page and server-rendered, so
// they are visible immediately and without any login or network call. The
// panels below them load their own data and fail independently.
export default function EmergencyPage() {
  return (
    <LiveLocationProvider>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5">
        <EmergencyHeader />
        <EmergencyNumbers />
        <OfficialAlerts />
        <NearbyHelp />
        <EmergencyGuidance />
        <PhrasesCard />
        <ReadinessCard />
      </div>
    </LiveLocationProvider>
  );
}
