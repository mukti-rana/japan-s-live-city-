"use client";

import dynamic from "next/dynamic";
import Tx from "@/components/i18n/Tx";

const ExploreMap = dynamic(() => import("@/components/explore/ExploreMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[22rem] w-full items-center justify-center rounded-2xl bg-[#0a1024] text-sm text-muted" role="status">
      <Tx en="Loading map…" />
    </div>
  ),
});

export default ExploreMap;
