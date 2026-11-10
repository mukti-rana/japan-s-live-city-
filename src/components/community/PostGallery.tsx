"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";

export interface GalleryImage {
  src: string;
  thumb: string;
  alt: string;
  width: number | null;
  height: number | null;
}

// The photos of a post: one large picture with arrows, swipe and the keyboard's
// left/right keys, and a row of thumbnails underneath. Photos keep their own
// proportions, and only the visible one is full size.
export default function PostGallery({ images }: { images: GalleryImage[] }) {
  const tr = useTranslate();
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = images.length;
  if (count === 0) return null;
  const current = images[Math.min(index, count - 1)];
  const go = (d: number) => setIndex((i) => (i + d + count) % count);

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={tr("Photos")}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          else if (e.key === "ArrowRight") go(1);
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
        className="relative overflow-hidden rounded-3xl border border-glass-border bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          width={current.width ?? undefined}
          height={current.height ?? undefined}
          decoding="async"
          fetchPriority={index === 0 ? "high" : "auto"}
          className="mx-auto block max-h-[75vh] w-full object-contain"
        />
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={tr("Previous photo")} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={tr("Next photo")} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <ChevronRight size={22} aria-hidden="true" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white" aria-live="polite">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <li key={img.thumb} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={`${tr("Photo")} ${i + 1}`} aria-current={i === index ? "true" : undefined} className={`block h-16 w-16 overflow-hidden rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${i === index ? "border-lilac" : "border-transparent opacity-75 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
