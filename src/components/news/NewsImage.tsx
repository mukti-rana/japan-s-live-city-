"use client";

import { useState } from "react";
import CategoryVisual, { type VisualSize, type VisualTopic } from "@/components/news/CategoryVisual";

// Pictures that have already failed to load. Shared across the page, so the
// same broken address is never requested a second time (the same story often
// appears in several sections).
const BAD_URLS = new Set<string>();

export const isKnownBadImage = (src: string | null) => Boolean(src && BAD_URLS.has(src));

// Anything smaller than this is a tracking pixel or an icon, not a story photo.
const MIN_SIDE = 40;

// A publisher's own picture for a story. When there isn't one — no address, a
// picture that fails to load, or a placeholder-sized image — it shows an
// editorial illustration for the story's category instead, clearly labelled as
// an illustration. It never substitutes some other photograph, and never shows
// a broken-image icon or an "unavailable" box.
export default function NewsImage({
  src,
  topic = "general",
  size = "card",
  className = "",
  priority = false,
  pending = false,
  onFailed,
}: {
  src: string | null;
  topic?: VisualTopic;
  size?: Exclude<VisualSize, "backdrop">;
  className?: string;
  priority?: boolean;
  // The publisher's picture is still being looked up.
  pending?: boolean;
  // Called once when the picture turns out to be unusable.
  onFailed?: () => void;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src && pending) {
    return <div aria-hidden="true" className={`bg-glass-bg-strong motion-safe:animate-pulse ${className}`} />;
  }

  if (!src || failedSrc === src || BAD_URLS.has(src)) {
    return <CategoryVisual topic={topic} size={size} className={className} />;
  }

  function fail() {
    if (!src) return;
    BAD_URLS.add(src);
    setFailedSrc(src);
    onFailed?.();
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- publisher-hosted images from many domains; not in a fixed image allowlist
    <img
      src={src}
      alt=""
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        const img = e.currentTarget;
        if (img.naturalWidth < MIN_SIDE || img.naturalHeight < MIN_SIDE) fail();
      }}
      onError={fail}
      className={`bg-glass-bg-strong object-cover ${className}`}
    />
  );
}
