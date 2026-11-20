"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";

export interface PostPhoto {
  src: string;
  alt: string;
}

// The photographs of one post, large, at the proportions of the first one (kept between tall and wide so the feed keeps its rhythm). One photograph
// is just a link into the post. Several slide sideways, snapping one at a time, with arrows (on a wide screen), a counter, and dots; the picture
// itself always opens the full post. The first photograph of the page loads at once, the rest as they come near.
export default function PostPhotos({ photos, ratio, href, title, priority = false }: { photos: PostPhoto[]; ratio: number; href: string; title: string; priority?: boolean }) {
  const tr = useTranslate();
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const many = photos.length > 1;

  const go = useCallback((n: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: n * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el || !many) return;
    const onScroll = () => setI(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [many]);

  return (
    <div className="group/ph relative w-full max-h-[78svh] bg-black" style={{ aspectRatio: String(ratio) }}>
      <div ref={track} className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((p, n) => (
          <Link key={p.src} href={href} tabIndex={n === i ? 0 : -1} aria-label={n === 0 ? title : undefined} className="relative block h-full w-full shrink-0 snap-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azure">
            {/* eslint-disable-next-line @next/next/no-img-element -- community photographs live in Supabase storage */}
            <img src={p.src} alt={p.alt} loading={priority && n === 0 ? "eager" : "lazy"} decoding="async" className="cm-photo h-full w-full object-cover" />
          </Link>
        ))}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/45 to-transparent" />
      {many && (
        <>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-md" aria-hidden="true">
            {i + 1}/{photos.length}
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
            {photos.map((p, n) => (
              <span key={p.src} className={`h-1.5 rounded-full transition-all duration-300 ${n === i ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
          {i > 0 && (
            <button type="button" onClick={() => go(i - 1)} aria-label={tr("Previous photo")} className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-black/75 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover/ph:opacity-100 [@media(hover:hover)]:flex">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
          )}
          {i < photos.length - 1 && (
            <button type="button" onClick={() => go(i + 1)} aria-label={tr("Next photo")} className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-black/75 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover/ph:opacity-100 [@media(hover:hover)]:flex">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
