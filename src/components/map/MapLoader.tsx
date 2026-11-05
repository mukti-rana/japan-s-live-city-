"use client";

import dynamic from "next/dynamic";
import Tx from "@/components/i18n/Tx";

const FullMap = dynamic(() => import("@/components/map/FullMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0a1024] text-sm text-muted" role="status">
      <Tx en="Loading map…" />
    </div>
  ),
});

export default function MapLoader() {
  return <FullMap />;
}
