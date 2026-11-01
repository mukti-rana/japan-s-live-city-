"use client";

import dynamic from "next/dynamic";

const FullMap = dynamic(() => import("@/components/map/FullMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0a1024] text-sm text-muted" role="status">
      Loading map…
    </div>
  ),
});

export default function MapLoader() {
  return <FullMap />;
}
