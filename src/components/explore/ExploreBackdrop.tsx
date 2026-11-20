"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { HOME_PHOTOS } from "@/lib/data/homePhotos";

// The Explore page's opening photograph: five of Japan's best-known views, one after another with a slow crossfade and a very slow zoom
// (so it feels like a film, not a slideshow), under a deep shade that keeps the heading and the search readable. They are the same
// photographs the site already hosts (credited on the Photo credits page). It holds still under reduced motion.
const SHOTS = [HOME_PHOTOS.fuji, HOME_PHOTOS.kiyomizu, HOME_PHOTOS.itsukushima, HOME_PHOTOS.fushimi, HOME_PHOTOS.todaiji];
const HOLD = 8000;

export default function ExploreBackdrop() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % SHOTS.length), HOLD);
    return () => window.clearInterval(id);
  }, [reduced]);
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black">
      {SHOTS.map((p, n) => (
        <div key={p.src} className={`absolute inset-0 transition-opacity duration-[1800ms] ease-in-out ${n === i ? "opacity-100" : "opacity-0"}`}>
          <Image src={p.src} alt="" fill sizes="100vw" priority={n === 0} quality={75} className={`object-cover ${n === i && !reduced ? "explore-kenburns" : ""}`} style={{ objectPosition: p.focus ?? "50% 50%" }} />
        </div>
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,10,0.55)_0%,rgba(4,5,10,0.25)_35%,rgba(4,5,10,0.78)_78%,#05060c_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,5,10,0.78)_0%,rgba(4,5,10,0.15)_62%,transparent_100%)]" />
    </div>
  );
}
