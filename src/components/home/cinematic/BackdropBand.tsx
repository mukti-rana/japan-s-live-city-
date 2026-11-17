import Image from "next/image";
import type { ReactNode } from "react";
import type { HomePhoto } from "@/lib/data/homePhotos";

const BLUR = "blur" as const;

// A full-width band with a photograph behind it, fading to pure black at the top and
// bottom so it melts into the chapters either side (no border, no edge). The picture is
// decoration, and its credit is on the Photo credits page, never on the homepage; every block of text on top sits on a
// black scrim. `side="right"` keeps the left, where the text is, darker and lets the
// photograph show on the right on wide screens.
export default function BackdropBand({ photo, children, side, className = "" }: { photo: HomePhoto; children: ReactNode; side?: "right"; className?: string }) {
  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <Image src={photo.src} alt="" sizes="100vw" fill placeholder={BLUR} blurDataURL={photo.blur} className={`-z-20 object-cover ${side === "right" ? "opacity-80 xl:object-[70%_50%]" : "opacity-55"}`} />
      <div aria-hidden="true" className={`absolute inset-0 -z-10 bg-[linear-gradient(#000,rgba(0,0,0,0.78)_26%,rgba(0,0,0,0.78)_74%,#000)] ${side === "right" ? "xl:hidden" : ""}`} />
      {side === "right" && (
        <div aria-hidden="true" className="absolute inset-0 -z-10 hidden bg-[linear-gradient(#000,transparent_22%,transparent_78%,#000),linear-gradient(90deg,#000_0%,rgba(0,0,0,0.9)_38%,rgba(0,0,0,0.3)_100%)] xl:block" />
      )}
      {children}
    </div>
  );
}
