import type { Metadata } from "next";
import EmergencyNumbers from "@/components/emergency/EmergencyNumbers";
import EmergencyGuidance from "@/components/emergency/EmergencyGuidance";
import PhrasesCard from "@/components/emergency/PhrasesCard";
import NearbyHelp from "@/components/emergency/NearbyHelp";
import OfficialAlerts from "@/components/emergency/OfficialAlerts";
import ReadinessCard from "@/components/emergency/ReadinessCard";
import EmergencyHeader from "@/components/emergency/EmergencyHeader";
import VisitorSupport from "@/components/emergency/VisitorSupport";
import CallChecklist from "@/components/emergency/CallChecklist";
import SectionHeading from "@/components/emergency/SectionHeading";
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

        <SectionHeading
          id="medical"
          title={{ en: "Medical & safety help", ja: "医療・安全のサポート" }}
          note={{
            en: "Official disaster alerts, nearby hospitals and shelters once a place is chosen, and how to find a doctor.",
            ja: "公的な災害情報、場所を選ぶと近くの病院・避難所、医療機関の探し方。",
          }}
        />
        <OfficialAlerts />
        <NearbyHelp />

        <SectionHeading
          id="visitors"
          title={{ en: "International visitor support", ja: "訪日外国人のサポート" }}
          note={{ en: "Help in other languages for visitors to Japan.", ja: "訪日旅行者のための多言語サポート。" }}
        />
        <VisitorSupport />

        <SectionHeading
          id="info"
          title={{ en: "Useful emergency information", ja: "役立つ緊急情報" }}
          note={{ en: "What to do, what to say, and how to be ready.", ja: "どうすればよいか、何を伝えるか、備え方。" }}
        />
        <CallChecklist />
        <EmergencyGuidance />
        <PhrasesCard />
        <ReadinessCard />
      </div>
    </LiveLocationProvider>
  );
}
