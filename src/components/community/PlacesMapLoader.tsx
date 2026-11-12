"use client";

import dynamic from "next/dynamic";
import Tx from "@/components/i18n/Tx";

// The map only loads in the browser (and only when the Map view is opened).
const PlacesMap = dynamic(() => import("@/components/community/PlacesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[26rem] w-full items-center justify-center rounded-2xl bg-[#0a1024] text-sm text-muted sm:h-[32rem]" role="status">
      <Tx en="Loading map…" />
    </div>
  ),
});

export default PlacesMap;
