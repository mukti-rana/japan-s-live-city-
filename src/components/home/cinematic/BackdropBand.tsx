import Image from "next/image";
import type { ReactNode } from "react";
import PhotoCredit from "@/components/home/cinematic/PhotoCredit";
import type { HomePhoto } from "@/lib/data/homePhotos";

// A full-width band with a photograph dimmed far down behind it. The picture is
// decoration (the credit is the visible text); every block of text on top sits on a
// black scrim, fading to pure black at the top and bottom edges.
export default function BackdropBand({ photo, children, className = "" }: { photo: HomePhoto; children: ReactNode; className?: string }) {
  return (
    <div className={`relative isolate overflow-hidden border-y border-line ${className}`}>
      <Image src={photo.src} alt="" sizes="100vw" quality={70} fill placeholder="blur" blurDataURL={photo.blur} className="-z-20 object-cover opacity-55" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(#000,rgba(0,0,0,0.72)_28%,rgba(0,0,0,0.72)_72%,#000)]" />
      {children}
      <PhotoCredit photo={photo} className="absolute bottom-3 right-[clamp(16px,4vw,48px)] hidden sm:block" />
    </div>
  );
}
