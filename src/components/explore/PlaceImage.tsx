"use client";

import { useState } from "react";
import { CATEGORY_ICON, CATEGORY_TONE } from "@/components/explore/categoryIcons";
import type { CategoryId } from "@/lib/explore/categories";
import type { Destination } from "@/lib/explore/types";

const BAD = new Set<string>();

// The destination's own photograph (from Wikimedia Commons, credited on the
// card or page), or — when there is none or it fails — a plain gradient with
// the category icon. Never someone else's photo, never a broken-image icon.
export default function PlaceImage({
  image,
  category,
  alt,
  size = "thumb",
  priority = false,
  className = "",
}: {
  image: Destination["image"];
  category: CategoryId;
  alt: string;
  size?: "thumb" | "full";
  priority?: boolean;
  className?: string;
}) {
  const src = image ? (size === "full" ? image.url : image.thumb) : null;
  const [failed, setFailed] = useState<string | null>(null);

  if (!src || failed === src || BAD.has(src)) {
    const [from, to, accent] = CATEGORY_TONE[category];
    const Icon = CATEGORY_ICON[category];
    return (
      <div role="img" aria-label={alt} className={`flex items-center justify-center ${className}`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <Icon size={size === "full" ? 56 : 30} strokeWidth={1.3} style={{ color: accent, opacity: 0.55 }} aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons images are served by their own thumbnailer
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        BAD.add(src);
        setFailed(src);
      }}
      className={`bg-glass-bg-strong object-cover ${className}`}
    />
  );
}
